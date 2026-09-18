// Error.captureStackTrace is V8-only, so it is absent from the standard Error type.
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

export class CommandSlugAlreadyExistsError extends Error {
  constructor(
    public readonly slug: string,
    public readonly spaceId: string,
  ) {
    super(`A command with slug "${slug}" already exists in this space`);
    this.name = 'RecipeSlugAlreadyExistsError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, CommandSlugAlreadyExistsError);
    }
  }
}
