/* eslint-disable no-empty-function */
import type { Provider } from 'ethers';

interface ILogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

interface IProviderConfig {
  /** The provider instance. */
  provider: Provider;

  /** Timeout in milliseconds for health checks on the provider. */
  healthCheckTimeout: number;

  /** Optional name for logging purposes. */
  name?: string;
}

interface IPrimaryProviderConfig extends IProviderConfig {
  retryOptions: {
    /** The maximum number of retry attempts for the primary provider. */
    maxRetries: number;

    /** The initial delay in milliseconds before attempting the first retry. */
    baseBackoffDelay: number;

    /** The maximum delay in milliseconds between retry attempts using exponential backoff. */
    maxBackoffDelay: number;

    /** The maximum duration in milliseconds for retrying the primary provider. */
    maxRetryDuration: number;
  };
}

/**
 * A `FailoverProvider` manages multiple `ethers.Provider` instances, switching between them to ensure
 * reliable access to the network. If the primary provider fails or becomes unresponsive,
 * it falls back to other configured providers and continues operating with a single active provider.
 *
 * Unlike `ethers.FallbackProvider`, it does *not* aim for consensus among providers.
 * It only interacts with **one** provider at a time, the currently active provider,
 * ensuring network connectivity rather than validating responses.
 * If the primary provider fails, it switches to the next failover provider, and retries the primary provider in the background until it recovers.
 *
 *  **Note:** This class is a `Singleton`. Be cautious when using it in scenarios that may
 * involve concurrent processes, as changes to the provider state may lead to unexpected behavior.
 */
class FailoverProvider {
  private static _instance: FailoverProvider | null = null;

  private _primaryProviderConfig!: IPrimaryProviderConfig;
  private _failoverProviders: IProviderConfig[] = [];

  private _activeProviderIndex: number = 0;
  private _activeProvider: Provider | null = null;

  private _isRetryingPrimary: boolean = false;
  private _retryInterval: NodeJS.Timeout | null = null;
  private _providerPingInterval: NodeJS.Timeout | null = null;

  private _logger: ILogger;

  private _signalListenersRegistered = false;

  private constructor(logger?: ILogger) {
    this._logger = logger ?? {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };

    this._registerSignalListeners();
  }

  /**
   * Initializes the `FailoverProvider` with primary and fallback providers.
   * @param {Object} config - Configuration object.
   * @param {IPrimaryProviderConfig} config.primaryProvider - Primary provider configuration.
   * @param {IProviderConfig[]} [config.fallbackProviders] - Optional fallback providers array. **Order matters**.
   * @param {ILogger} [config.logger] - Optional logger for custom logging.
   * @param {ILogger} [config.pingInterval] - Optional interval in milliseconds for logging the active provider.
   * @returns {FailoverProvider} - The singleton instance of `FailoverProvider`.
   */
  public static init(config: {
    primaryProvider: IPrimaryProviderConfig;
    fallbackProviders?: IProviderConfig[];
    logger?: ILogger;
    pingInterval?: number;
  }): FailoverProvider {
    if (!FailoverProvider._instance) {
      FailoverProvider._instance = new FailoverProvider(config.logger);
    } else {
      throw new Error('The provider has already been initialized.');
    }

    FailoverProvider._instance._primaryProviderConfig = config.primaryProvider;
    FailoverProvider._instance._failoverProviders =
      config.fallbackProviders ?? [];

    FailoverProvider._instance._activeProvider =
      FailoverProvider._instance._primaryProviderConfig.provider;

    FailoverProvider._instance._enableFailoverOnError(
      FailoverProvider._instance._activeProvider,
    );

    if (config.pingInterval) {
      FailoverProvider._instance.startPingingCurrentProvider(
        config.pingInterval,
      );
    }

    return FailoverProvider._instance;
  }

  /**
   * Returns the active provider, which is either the primary provider
   * or, if the primary provider has failed, a fallback provider. It ensures that the provider
   * is always initialized and available for use.
   *
   * **Important:** You should not hold a reference to the provider returned by this function.
   * The provider may switch dynamically (from primary to fallback or back to primary) in case of failure or recovery.
   * Therefore, always call `getActiveProvider` when you need to interact with the provider to ensure you are using
   * the most current one.
   *
   * **Note:** This function does not create new provider instances each time it is called. It simply returns
   * the active provider without re-initializing them unnecessarily, so there
   * is no performance concern in calling `getActiveProvider` multiple times.
   *
   * @returns {Promise<Provider>} The currently active provider (primary or fallback).
   */
  public static getActiveProvider(): Provider {
    if (!FailoverProvider._instance) {
      throw new Error(
        'The provider has not been initialized. Call `init` before accessing the active provider.',
      );
    }

    return FailoverProvider._instance._activeProvider!;
  }

  public static addFallbackProvider(provider: IProviderConfig): void {
    if (!FailoverProvider._instance) {
      throw new Error(
        'The provider has not been initialized. Call `init` before adding fallback providers.',
      );
    }

    FailoverProvider._instance._failoverProviders.push(provider);
  }

  public static async destroyFallbackProvider(index: number): Promise<void> {
    if (!FailoverProvider._instance) {
      throw new Error(
        'The provider has not been initialized. Call `init` before adding fallback providers.',
      );
    }

    if (
      index >= 0 &&
      index < FailoverProvider._instance._failoverProviders.length
    ) {
      const removedProvider =
        FailoverProvider._instance._failoverProviders.splice(index, 1);
      removedProvider[0].provider.destroy();
    } else {
      throw new Error(
        'Invalid index. No provider found at the specified index.',
      );
    }
  }

  public static async destroy(): Promise<void> {
    if (!FailoverProvider._instance) {
      return;
    }

    FailoverProvider._instance._primaryProviderConfig.provider.destroy();
    for (const fallback of FailoverProvider._instance._failoverProviders) {
      fallback.provider.destroy();
    }

    FailoverProvider._instance._clearRetryInterval();
    FailoverProvider._instance.stopPingingCurrentProvider();

    FailoverProvider._instance._logger.info('All providers destroyed.');

    FailoverProvider._instance = null;
  }

  /**
   * Logs the provider information at regular intervals.
   *
   * @param {number} interval - The time in milliseconds between each log entry.
   */
  public startPingingCurrentProvider(interval: number): void {
    if (this._providerPingInterval) {
      clearInterval(this._providerPingInterval);
      this._providerPingInterval = null;
    }

    this._providerPingInterval = setInterval(() => {
      this._logger.info(
        'Failover provider is configured with the following providers:',
      );

      const isActivePrimary =
        this._primaryProviderConfig.provider === this._activeProvider;

      this._logger.info(
        `\t0. ${isActivePrimary ? '[ACTIVE] ' : ''}[PRIMARY] ${this._getProviderName(this._primaryProviderConfig.provider)}`,
      );

      this._failoverProviders.forEach((provider, index) => {
        const isActiveFailover = provider.provider === this._activeProvider;
        this._logger.info(
          `\t${index + 1}. ${isActiveFailover ? '[ACTIVE] ' : ''}[FAILOVER] ${this._getProviderName(provider.provider)}`,
        );
      });
    }, interval);
  }

  public stopPingingCurrentProvider(): void {
    if (!this._providerPingInterval) {
      return;
    }

    clearInterval(this._providerPingInterval);
  }

  private _getProviderName(provider: Provider): string {
    if (provider === this._primaryProviderConfig.provider) {
      return this._primaryProviderConfig.name ?? 'Unnamed Primary Provider';
    }

    const fallbackProvider = this._failoverProviders.find(
      (config) => config.provider === provider,
    );
    return fallbackProvider?.name ?? 'Unnamed Fallback Provider';
  }

  private _enableFailoverOnError(provider: Provider) {
    provider.on('error', async (error: Error) => {
      this._logger.error(
        `Provider [index: ${this._activeProviderIndex}, name: ${this._getProviderName(provider)}] failed with error: ${error.message}`,
      );

      await this._switchToNextProvider();
    });
  }

  private async _switchToNextProvider(): Promise<void> {
    this._activeProviderIndex++;

    const failedProvider = this._getProviderName(this._activeProvider!);
    if (this._activeProviderIndex > this._failoverProviders.length) {
      this._logger.error(
        `All providers have failed. No more fallback providers available. Last active provider: ${failedProvider}`,
      );
      this._activeProviderIndex = 0;
    } else {
      const nextProviderConfig =
        this._failoverProviders[this._activeProviderIndex - 1];

      this._logger.info(
        `Switched to fallback provider [index: ${this._activeProviderIndex}, name: ${nextProviderConfig.name}]`,
      );

      try {
        await this._checkProviderHealth(
          nextProviderConfig.provider,
          nextProviderConfig.healthCheckTimeout,
        );
        this._activeProvider = nextProviderConfig.provider;
        this._enableFailoverOnError(this._activeProvider);
        this.startRetryingPrimaryProvider();
      } catch (error) {
        this._logger.error(
          `Fallback provider [index: ${this._activeProviderIndex}] also failed. Moving to the next one...`,
        );
        await this._switchToNextProvider();
      }
    }
  }

  private startRetryingPrimaryProvider(): void {
    if (
      this._isRetryingPrimary ||
      this._activeProvider === this._primaryProviderConfig.provider
    ) {
      return;
    }

    this._isRetryingPrimary = true;

    const { retryOptions, provider } = this._primaryProviderConfig;
    let retryAttempt = 0;
    const retryStartTime = Date.now();

    const retry = async () => {
      const elapsedTime = Date.now() - retryStartTime;
      if (elapsedTime > retryOptions.maxRetryDuration) {
        this._logger.error(
          `Max retry duration of ${retryOptions.maxRetryDuration / 1000} seconds exceeded for primary provider.`,
        );
        throw new Error(
          'Primary provider retry duration exceeded. All providers failed.',
        );
      }

      this._logger.info('Retrying primary provider...');

      try {
        await this._checkProviderHealth(
          provider,
          this._primaryProviderConfig.healthCheckTimeout,
        );
        this._logger.info('Primary provider recovered and reinitialized.');

        this._activeProviderIndex = 0;
        this._activeProvider = provider;
        this._clearRetryInterval();
        this._isRetryingPrimary = false;
      } catch (error: any) {
        retryAttempt++;
        const backoffDelay = Math.min(
          retryOptions.baseBackoffDelay * 2 ** retryAttempt,
          retryOptions.maxBackoffDelay,
        );

        this._logger.warn(
          `Primary provider retry failed with error '${error.message}'. Retrying in ${backoffDelay / 1000} seconds.`,
        );

        this._retryInterval = setTimeout(retry, backoffDelay);
      }
    };

    retry();
  }

  private async _checkProviderHealth(
    provider: Provider,
    timeoutMs: number,
  ): Promise<void> {
    try {
      await Promise.race([
        provider.getBlockNumber(),
        new Promise<void>((_, reject) => {
          setTimeout(
            () => reject(new Error('Provider health check timeout')),
            timeoutMs,
          );
        }),
      ]);
    } catch (error) {
      this._logger.debug?.('Provider health check failed.');
      throw error;
    }
  }

  private _clearRetryInterval(): void {
    if (this._retryInterval) {
      clearTimeout(this._retryInterval);
      this._retryInterval = null;
    }
  }

  private _registerSignalListeners(): void {
    if (this._signalListenersRegistered) return;

    process.on('SIGINT', async () => {
      await this._handleExit('SIGINT');
    });

    process.on('SIGTERM', async () => {
      await this._handleExit('SIGTERM');
    });

    this._signalListenersRegistered = true;
  }

  private async _handleExit(signal: string) {
    this._logger.info(`Received ${signal}, cleaning up providers...`);

    await FailoverProvider.destroy();
    process.exit(0);
  }
}

export default FailoverProvider;
