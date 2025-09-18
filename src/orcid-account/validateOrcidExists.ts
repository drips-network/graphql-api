import appSettings from '../common/appSettings';

interface IOrcidValidationCache {
  get(orcid: string): boolean | undefined;
  set(orcid: string, exists: boolean): void;
}

class OrcidValidationCache implements IOrcidValidationCache {
  private _cache: Map<string, { exists: boolean; timestamp: number }>;
  private readonly _ttl: number;
  private readonly _maxSize: number;

  constructor(ttlMs: number = 3600000 /* 1 hour */, maxSize: number = 1000) {
    this._cache = new Map();
    this._ttl = ttlMs;
    this._maxSize = maxSize;
  }

  get(orcid: string): boolean | undefined {
    const entry = this._cache.get(orcid);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this._ttl) {
      this._cache.delete(orcid);
      return undefined;
    }

    return entry.exists;
  }

  set(orcid: string, exists: boolean): void {
    if (this._cache.size >= this._maxSize) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey !== undefined) {
        this._cache.delete(firstKey);
      }
    }
    this._cache.set(orcid, { exists, timestamp: Date.now() });
  }
}

const validationCache = new OrcidValidationCache();

/**
 * Validates if an ORCID identifier exists on orcid.org.
 * @param orcidId The ORCID identifier (e.g., "0009-0001-4272-298X")
 * @returns True if the ORCID exists, false if it doesn't exist
 */
export default async function validateOrcidExists(
  orcidId: string,
): Promise<boolean> {
  const cachedResult = validationCache.get(orcidId);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  try {
    const response = await fetch(
      `${appSettings.orcidApiEndpoint}/${orcidId}/person`,
      {
        method: 'HEAD',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    const exists = response.status === 200;
    validationCache.set(orcidId, exists);

    if (!exists && response.status === 404) {
      console.log(`ORCID ${orcidId} does not exist on orcid.org`);
    }

    return exists;
  } catch (error) {
    console.error(
      `Failed to validate ORCID ${orcidId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return false;
  }
}
