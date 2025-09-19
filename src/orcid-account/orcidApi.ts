import appSettings from '../common/appSettings';
import { getCache, setCacheWithJitter } from '../cache/redis';
import { isOrcidId } from '../utils/assert';
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
} from '../utils/fetchWithTimeout';

const ORCID_CACHE_PREFIX = 'linkedIdentity:orcid';

type OrcidProfile = {
  orcidId: string;
  givenName: string | null;
  familyName: string | null;
};

type OrcidNameField = {
  value?: string;
};

type OrcidPersonResponse = {
  name?: {
    'credit-name'?: OrcidNameField;
    'given-names'?: OrcidNameField;
    'family-name'?: OrcidNameField;
  };
};

function buildCacheKey(orcidId: string): string {
  return `${ORCID_CACHE_PREFIX}:${orcidId}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizedStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

type OrcidNameParts = {
  givenName: string | null;
  familyName: string | null;
};

function extractNameParts(payload: OrcidPersonResponse): OrcidNameParts | null {
  const givenName = normalizedStringOrNull(
    payload.name?.['given-names']?.value,
  );
  const familyName = normalizedStringOrNull(
    payload.name?.['family-name']?.value,
  );

  if (!givenName && !familyName) {
    return null;
  }

  return { givenName, familyName };
}

function parseCachedProfile(value: unknown): OrcidProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const orcidId = normalizedStringOrNull(record.orcidId);
  if (!orcidId) {
    return null;
  }

  const givenName = normalizedStringOrNull(record.givenName);
  const familyName = normalizedStringOrNull(record.familyName);
  if (givenName || familyName) {
    return {
      orcidId,
      givenName,
      familyName,
    };
  }

  const legacyName = normalizedStringOrNull(record.name);
  if (legacyName) {
    return {
      orcidId,
      givenName: legacyName,
      familyName: null,
    };
  }

  return null;
}

export async function fetchOrcidProfile(
  orcidId: string,
): Promise<OrcidProfile | null> {
  if (!isOrcidId(orcidId)) {
    throw new Error('Invalid ORCID identifier provided.');
  }

  const cacheKey = buildCacheKey(orcidId);
  const { value: cached } = await getCache(cacheKey);
  if (cached) {
    try {
      const parsedJson = JSON.parse(cached) as unknown;
      const parsedProfile = parseCachedProfile(parsedJson);
      if (parsedProfile) {
        // Cached 404
        console.log('ORCID cache hit with null entry.', { orcidId });
        return parsedProfile;
      }
      if (parsedJson === null) {
        return null;
      }
    } catch (error) {
      console.error('Failed to parse cached ORCID profile:', error);
    }
  }

  try {
    console.log('Fetching ORCID profile from API.', { orcidId });

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    const token = appSettings.orcidApiToken?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(
      `${appSettings.orcidApiEndpoint}/${orcidId}/person`,
      {
        headers,
      },
      DEFAULT_FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      if (response.status === 404) {
        await setCacheWithJitter(
          cacheKey,
          JSON.stringify(null),
          appSettings.cacheSettings.projectErrorTtlSeconds,
          appSettings.cacheSettings.ttlJitterRatio,
        );
      } else {
        console.error('ORCID profile fetch failed:', {
          status: response.status,
          statusText: response.statusText,
        });
      }
      return null;
    }

    const payload = (await response.json()) as OrcidPersonResponse;
    const nameParts = extractNameParts(payload);

    if (!nameParts) {
      return null;
    }

    const profile: OrcidProfile = {
      orcidId,
      givenName: nameParts.givenName,
      familyName: nameParts.familyName,
    };

    await setCacheWithJitter(
      cacheKey,
      JSON.stringify(profile),
      appSettings.cacheSettings.linkedIdentityTtlSeconds,
      appSettings.cacheSettings.ttlJitterRatio,
    );

    console.log('ORCID profile fetched from API.', { orcidId });

    return profile;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Failed to fetch ORCID profile:', error);
    }
    return null;
  }
}

export type { OrcidProfile };
