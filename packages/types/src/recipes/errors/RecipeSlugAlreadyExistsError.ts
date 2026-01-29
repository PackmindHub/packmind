// Type guard for V8-specific Error.captureStackTrace
interface IErrorWithCaptureStackTrace {
  captureStackTrace: (
    error: Error,
    constructor: new (...args: unknown[]) => unknown,
  ) => void;
}

function hasCaptureStackTrace(
  error: typeof Error,
): error is typeof Error & IErrorWithCaptureStackTrace {
  return (
    typeof (error as unknown as IErrorWithCaptureStackTrace)
      .captureStackTrace === 'function'
  );
}

/**
 * Error thrown when attempting to create a recipe with a slug that already exists in a space
 */
export class RecipeSlugAlreadyExistsError extends Error {
  constructor(
    public readonly slug: string,
    public readonly spaceId: string,
  ) {
    super(`A command with slug "${slug}" already exists in this space`);
    this.name = 'RecipeSlugAlreadyExistsError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, RecipeSlugAlreadyExistsError);
    }
  }
}
