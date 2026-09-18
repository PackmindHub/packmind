// Error.captureStackTrace is V8-only, so it is absent from the standard Error type.
interface ErrorWithCaptureStackTrace {
  captureStackTrace: (
    error: Error,
    constructor: new (...args: unknown[]) => unknown,
  ) => void;
}

function hasCaptureStackTrace(
  error: typeof Error,
): error is typeof Error & ErrorWithCaptureStackTrace {
  return (
    typeof (error as unknown as ErrorWithCaptureStackTrace)
      .captureStackTrace === 'function'
  );
}

export class SkillAlreadyExistsError extends Error {
  constructor(
    public readonly skillName: string,
    public readonly skillSlug: string,
    public readonly spaceId: string,
  ) {
    super(
      `Skill "${skillName}" (slug: ${skillSlug}) already exists in this space`,
    );
    this.name = 'SkillAlreadyExistsError';

    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, SkillAlreadyExistsError);
    }
  }
}
