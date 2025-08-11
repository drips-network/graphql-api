import { describe, it, expect, vi, beforeEach } from 'vitest';
import validateOrcidExists from '../../src/orcid-account/validateOrcidExists';

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
    expect(mockFetch).toHaveBeenCalledWith(
      'https://pub.orcid.org/v3.0/0009-0001-4272-298X/person',
      {
        method: 'HEAD',
        headers: {
          Accept: 'application/json',
        },
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
    expect(mockFetch).toHaveBeenCalledWith(
      'https://pub.orcid.org/v3.0/0009-0000-0000-0000/person',
      {
        method: 'HEAD',
        headers: {
          Accept: 'application/json',
        },
        signal: expect.any(AbortSignal),
      },
    );
  });
});
