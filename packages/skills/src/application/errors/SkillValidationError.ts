export type SkillValidationErrorDetail = {
  field: string;
  message: string;
};

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
