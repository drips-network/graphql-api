/* eslint-disable no-console */
import { GraphQLError } from 'graphql';
import { getCache, setCacheWithJitter } from '../cache/redis';
import { isOrcidId, unprefixOrcidId } from '../utils/assert';
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
} from '../utils/fetchWithTimeout';
import appSettings from '../common/appSettings';
import {
  getOrcidAccessToken,
  resetOrcidAccessToken,
} from './orcidTokenProvider';
import { PUBLIC_ERROR_CODES } from '../utils/formatError';

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

export default async function fetchOrcidProfile(
  orcidId: string,
): Promise<OrcidProfile | null> {
  if (!isOrcidId(orcidId)) {
    throw new GraphQLError('Invalid ORCID identifier provided.', {
      extensions: { code: PUBLIC_ERROR_CODES.BadUserInput },
    });
  }

  // Strip sandbox- prefix for API call since ORCID API doesn't recognize it in the URL
  const unprefixedOrcidId = unprefixOrcidId(orcidId);

  const cacheKey = buildCacheKey(unprefixedOrcidId);
  const { value: cached } = await getCache(cacheKey);
  if (cached) {
    try {
      const parsedJson = JSON.parse(cached) as unknown;
      const parsedProfile = parseCachedProfile(parsedJson);
      if (parsedProfile) {
        return parsedProfile;
      }
      if (parsedJson === null) {
        // Cached 404
        console.log('ORCID cache hit with null entry.', {
          orcidId: unprefixedOrcidId,
        });
        return null;
      }
    } catch (error) {
      console.error('Failed to parse cached ORCID profile:', error);
    }
  }

  try {
    console.log('Fetching ORCID profile from API.', {
      orcidId: unprefixedOrcidId,
    });

    let response = await requestProfile(unprefixedOrcidId);

    if (response.status === 401) {
      resetOrcidAccessToken();
      response = await requestProfile(unprefixedOrcidId);
    }

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
      orcidId: unprefixedOrcidId,
      givenName: nameParts.givenName,
      familyName: nameParts.familyName,
    };

    await setCacheWithJitter(
      cacheKey,
      JSON.stringify(profile),
      appSettings.cacheSettings.linkedIdentityTtlSeconds,
      appSettings.cacheSettings.ttlJitterRatio,
    );

    console.log('ORCID profile fetched from API.', {
      orcidId: unprefixedOrcidId,
    });

    return profile;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }

    throw new GraphQLError('Failed to fetch ORCID profile.', {
      originalError: error instanceof Error ? error : undefined,
      extensions: { code: PUBLIC_ERROR_CODES.ExternalServiceError },
    });
  }
}

async function requestProfile(orcidId: string): Promise<Response> {
  const token = await getOrcidAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  return fetchWithTimeout(
    `${appSettings.orcid.apiEndpoint}/${orcidId}/person`,
    {
      headers,
    },
    DEFAULT_FETCH_TIMEOUT_MS,
  );
}
