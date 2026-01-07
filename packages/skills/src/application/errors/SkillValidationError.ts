/**
 * Represents a single validation error for a skill's metadata.
 */
export type SkillValidationErrorDetail = {
  field: string;
  message: string;
};

/**
 * Error thrown when skill metadata validation fails.
 * Contains details about all validation errors found.
 */
export class SkillValidationError extends Error {
  readonly errors: SkillValidationErrorDetail[];

  constructor(errors: SkillValidationErrorDetail[]) {
    const messages = errors.map((e) => e.message).join('; ');
    super(`Skill validation failed: ${messages}`);
    this.name = 'SkillValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, SkillValidationError.prototype);
  }
}
