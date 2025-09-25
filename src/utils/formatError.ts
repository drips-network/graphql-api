import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { BaseError } from 'sequelize';

/** Public error codes safe to surface to clients. */
export const PUBLIC_ERROR_CODES = {
  BadUserInput: 'BAD_USER_INPUT',
  ExternalServiceError: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type PublicErrorCode =
  (typeof PUBLIC_ERROR_CODES)[keyof typeof PUBLIC_ERROR_CODES];

const PUBLIC_ERROR_CODES_SET = new Set<PublicErrorCode>(
  Object.values(PUBLIC_ERROR_CODES),
);

export default function formatError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  logErrorDetails(formattedError, error);

  return sanitizeErrorResponse(formattedError);
}
function logErrorDetails(
  formattedError: GraphQLFormattedError,
  error: unknown,
): void {
  const payload = buildErrorLogPayload(formattedError, error);
  console.error(payload);
}

type ErrorLogPayload = {
  category: string;
  path: GraphQLFormattedError['path'];
  message: string;
  formattedMessage: string;
  extensions: GraphQLFormattedError['extensions'];
  originalMessage: string | undefined;
  stack: string | undefined;
};

function buildErrorLogPayload(
  formattedError: GraphQLFormattedError,
  error: unknown,
): ErrorLogPayload {
  const graphQLError = error instanceof GraphQLError ? error : undefined;
  const originalError =
    // eslint-disable-next-line no-nested-ternary
    graphQLError?.originalError instanceof Error
      ? graphQLError.originalError
      : error instanceof Error
        ? error
        : undefined;

  const stack =
    originalError?.stack ??
    graphQLError?.stack ??
    (error instanceof Error ? error.stack : undefined);

  let category = 'UnknownError';

  if (originalError instanceof BaseError) {
    category = 'DatabaseError';
  } else if (graphQLError) {
    category = resolveExtensionCode(graphQLError.extensions, 'UnknownError');
  } else if (
    error instanceof Error &&
    typeof error.name === 'string' &&
    error.name.length > 0
  ) {
    category = error.name;
  }

  const message =
    graphQLError?.message ??
    (error instanceof Error ? error.message : formattedError.message);

  return {
    category,
    path: formattedError.path,
    message,
    formattedMessage: formattedError.message,
    extensions: formattedError.extensions,
    originalMessage: originalError?.message,
    stack,
  };
}

function sanitizeErrorResponse(
  formattedError: GraphQLFormattedError,
): GraphQLFormattedError {
  const resolvedCode = resolveExtensionCode(
    formattedError.extensions,
    'INTERNAL_SERVER_ERROR',
  );

  const isPublic = PUBLIC_ERROR_CODES_SET.has(resolvedCode as PublicErrorCode);

  const sanitized: GraphQLFormattedError = {
    message: isPublic ? formattedError.message : 'Internal server error',
    extensions: { code: resolvedCode },
    // Include path and location for public errors
    ...(isPublic &&
      formattedError.path !== undefined && { path: formattedError.path }),
    ...(isPublic &&
      formattedError.locations !== undefined && {
        locations: formattedError.locations,
      }),
  };

  return sanitized;
}

function resolveExtensionCode(
  extensions: GraphQLFormattedError['extensions'] | GraphQLError['extensions'],
  fallback: string,
): string {
  const candidate = extensions?.code;
  return typeof candidate === 'string' ? candidate : fallback;
}
