import { describe, it, expect, vi, beforeEach } from 'vitest';
import validateOrcidExists from '../../src/orcid-account/validateOrcidExists';
import { resetOrcidAccessToken } from '../../src/orcid-account/orcidTokenProvider';
import appSettings from '../../src/common/appSettings';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('validateOrcidExists', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    resetOrcidAccessToken();
  });

  it('should return true when ORCID exists', async () => {
    // Mock token response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'mock-token',
          expires_in: 3600,
        }),
      })
      // Mock ORCID API response
      .mockResolvedValueOnce({
        status: 200,
      });

    const result = await validateOrcidExists('0009-0001-4272-298X');

    expect(result).toBe(true);

    // Verify token request
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      appSettings.orcid.tokenEndpoint,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${appSettings.orcid.clientId}&client_secret=${process.env.ORCID_CLIENT_SECRET}&grant_type=client_credentials&scope=%2Fread-public`,
        signal: expect.any(AbortSignal),
      },
    );

    // Verify ORCID API request
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${appSettings.orcid.apiEndpoint}/0009-0001-4272-298X/person`,
      {
        method: 'HEAD',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer mock-token',
        },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('should return false when ORCID does not exist', async () => {
    // Mock token response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'mock-token',
          expires_in: 3600,
        }),
      })
      // Mock ORCID API response
      .mockResolvedValueOnce({
        status: 404,
      });

    const result = await validateOrcidExists('0009-0000-0000-0000');

    expect(result).toBe(false);

    // Verify token request
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      appSettings.orcid.tokenEndpoint,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${appSettings.orcid.clientId}&client_secret=${process.env.ORCID_CLIENT_SECRET}&grant_type=client_credentials&scope=%2Fread-public`,
        signal: expect.any(AbortSignal),
      },
    );

    // Verify ORCID API request
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${appSettings.orcid.apiEndpoint}/0009-0000-0000-0000/person`,
      {
        method: 'HEAD',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer mock-token',
        },
        signal: expect.any(AbortSignal),
      },
    );
  });
});
