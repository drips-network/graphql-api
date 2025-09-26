import appSettings from '../common/appSettings';
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
} from '../utils/fetchWithTimeout';

const TOKEN_SAFETY_WINDOW_MS = 5 * 60 * 1000;

type OrcidTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type OrcidTokenState = {
  value: string;
  expiresAt: number;
};

type OrcidTokenProviderConfig = {
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
};

type OrcidTokenProvider = {
  getToken: () => Promise<string>;
  reset: () => void;
};

function resolveOrcidClientSecret(): string {
  const secret = process.env.ORCID_CLIENT_SECRET?.trim();
  if (secret) {
    return secret;
  }
  throw new Error('Missing ORCID_CLIENT_SECRET in environment.');
}

function createOrcidTokenProvider(
  config: OrcidTokenProviderConfig,
): OrcidTokenProvider {
  let cachedToken: Readonly<OrcidTokenState> | null = null;

  async function requestToken(): Promise<Readonly<OrcidTokenState>> {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
      scope: '/read-public',
    });

    const response = await fetchWithTimeout(
      config.tokenEndpoint,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
      DEFAULT_FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to obtain ORCID token: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as OrcidTokenResponse;
    const tokenValue = payload.access_token?.trim();

    if (!tokenValue) {
      throw new Error('ORCID token response missing access_token.');
    }

    if (
      typeof payload.expires_in !== 'number' ||
      !Number.isFinite(payload.expires_in) ||
      payload.expires_in <= 0
    ) {
      throw new Error('ORCID token response missing valid expires_in.');
    }

    const expiresAt =
      Date.now() +
      Math.max(payload.expires_in * 1000 - TOKEN_SAFETY_WINDOW_MS, 0);

    return Object.freeze({
      value: tokenValue,
      expiresAt,
    });
  }

  async function getToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.value;
    }

    cachedToken = await requestToken();
    return cachedToken.value;
  }

  function reset(): void {
    cachedToken = null;
  }

  return { getToken, reset };
}

const { clientId, tokenEndpoint } = appSettings.orcid;

const provider = createOrcidTokenProvider({
  clientId,
  clientSecret: resolveOrcidClientSecret(),
  tokenEndpoint,
});

export const getOrcidAccessToken = provider.getToken;
export const resetOrcidAccessToken = provider.reset;
