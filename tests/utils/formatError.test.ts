import { describe, test, expect } from 'vitest';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';

import formatError from '../../src/utils/formatError';

type FormattedErrorInput = {
  code?: string;
  message: string;
  path?: GraphQLFormattedError['path'];
  locations?: GraphQLFormattedError['locations'];
  extensions?: GraphQLFormattedError['extensions'];
};

function createFormattedError({
  code,
  message,
  path = ['query', 'field'],
  locations,
  extensions,
}: FormattedErrorInput): GraphQLFormattedError {
  const mergedExtensions =
    code === undefined ? extensions : { ...(extensions ?? {}), code };

  return {
    message,
    path,
    locations,
    extensions: mergedExtensions,
  };
}

describe('formatError', () => {
  test('returns original message for public error codes', () => {
    const code = 'EXTERNAL_SERVICE_ERROR';
    const message = 'External call failed.';
    const path = ['mutation', 'createThing'];
    const locations = [{ line: 12, column: 5 }];
    const formattedError = createFormattedError({
      code,
      message,
      path,
      locations,
    });
    const graphQLError = new GraphQLError(message, { extensions: { code } });

    const result = formatError(formattedError, graphQLError);

    expect(result.message).toBe(message);
    expect(result.extensions?.code).toBe(code);
    expect(result.path).toEqual(path);
    expect(result.locations).toEqual(locations);
  });

  test('hides message for non-public error codes', () => {
    const code = 'DATABASE_TIMEOUT';
    const message = 'Sensitive details leaked.';
    const formattedError = createFormattedError({
      code,
      message,
      extensions: { code, detail: 'Do not expose' },
    });
    const graphQLError = new GraphQLError(message, {
      extensions: { code, detail: 'Do not expose' },
    });

    const result = formatError(formattedError, graphQLError);

    expect(result.message).toBe('Internal server error');
    expect(result.extensions?.code).toBe(code);
    expect(result.extensions).toEqual({ code });
    expect(result.path).toBeUndefined();
    expect(result.locations).toBeUndefined();
  });

  test('falls back to internal server error when code is missing', () => {
    const message = 'Unhandled exception occurred.';
    const formattedError = createFormattedError({ message });
    const graphQLError = new GraphQLError(message);

    const result = formatError(formattedError, graphQLError);

    expect(result.message).toBe('Internal server error');
    expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(result.path).toBeUndefined();
    expect(result.locations).toBeUndefined();
  });
});
