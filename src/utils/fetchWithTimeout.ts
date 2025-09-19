const DEFAULT_FETCH_TIMEOUT_MS = 5000;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export async function fetchWithTimeout(
  input: FetchInput,
  init: FetchInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const { signal, ...rest } = init ?? {};

  let abortListener: (() => void) | undefined;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      abortListener = () => controller.abort();
      signal.addEventListener('abort', abortListener);
    }
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...rest,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    if (abortListener && signal) {
      signal.removeEventListener('abort', abortListener);
    }
  }
}

export { DEFAULT_FETCH_TIMEOUT_MS };
