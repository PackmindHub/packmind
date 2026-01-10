/**
 * Skill-related domain errors for business logic violations
 */

// Type guard for V8-specific Error.captureStackTrace
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

/**
 * Error thrown when attempting to create a skill that already exists in a space
 */
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

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, SkillAlreadyExistsError);
    }
  }
}
