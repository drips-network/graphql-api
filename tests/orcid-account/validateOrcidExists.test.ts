import { describe, it, expect, vi, beforeEach } from 'vitest';
import validateOrcidExists from '../../src/orcid-account/validateOrcidExists';
import appSettings from '../../src/common/appSettings';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('validateOrcidExists', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should return true when ORCID exists', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
    });

    const result = await validateOrcidExists('0009-0001-4272-298X');

    expect(result).toBe(true);
    const expectedHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    if (appSettings.orcidApiToken) {
      expectedHeaders.Authorization = `Bearer ${appSettings.orcidApiToken}`;
    }

    expect(mockFetch).toHaveBeenCalledWith(
      `${appSettings.orcidApiEndpoint}/0009-0001-4272-298X/person`,
      {
        method: 'HEAD',
        headers: expectedHeaders,
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('should return false when ORCID does not exist', async () => {
    mockFetch.mockResolvedValue({
      status: 404,
    });

    const result = await validateOrcidExists('0009-0000-0000-0000');

    expect(result).toBe(false);
    const expectedHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    if (appSettings.orcidApiToken) {
      expectedHeaders.Authorization = `Bearer ${appSettings.orcidApiToken}`;
    }

    expect(mockFetch).toHaveBeenCalledWith(
      `${appSettings.orcidApiEndpoint}/0009-0000-0000-0000/person`,
      {
        method: 'HEAD',
        headers: expectedHeaders,
        signal: expect.any(AbortSignal),
      },
    );
  });
});
