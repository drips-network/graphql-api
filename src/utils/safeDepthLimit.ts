import depthLimit from 'graphql-depth-limit';
import type { ValidationContext } from 'graphql';

/**
 * A wrapper around graphql-depth-limit that catches specific crashes caused by
 * undefined fragments (which should be handled by standard validation but cause
 * graphql-depth-limit to throw).
 */
const safeDepthLimit =
  (maxDepth: number, options: any = {}, callback: any = () => undefined) =>
  (validationContext: ValidationContext) => {
    try {
      const validator = depthLimit(maxDepth, options, callback);
      return validator(validationContext);
    } catch (err: any) {
      // graphql-depth-limit version 1.1.0 crashes on unknown fragments with
      // TypeError: Cannot read properties of undefined (reading 'kind')
      // We catch this specific error to allow standard GraphQL validation to handle the
      // unknown fragment error, preventing a 500 Internal Server Error.
      if (
        err instanceof TypeError &&
        err.message.includes(
          "Cannot read properties of undefined (reading 'kind')",
        )
      ) {
        // If we catch this error, it means depth limit check failed due to invalid AST
        // We return the context as is, skipping the depth check for this invalid query.
        // Standard validation will subsequently fail with a proper 400 error.
        return validationContext;
      }
      throw err;
    }
  };

export default safeDepthLimit;
