import { SkillsError } from './SkillsError';

export type SkillValidationErrorDetail = {
  field: string;
  message: string;
};

export class SkillValidationError extends SkillsError {
  readonly errors: SkillValidationErrorDetail[];

  constructor(errors: SkillValidationErrorDetail[]) {
    const messages = errors.map((e) => e.message).join('; ');
    super(
      'invalid_input',
      'skill_validation_failed',
      { validationErrors: errors },
      `Skill validation failed: ${messages}`,
    );
    this.name = 'SkillValidationError';
    this.errors = errors;
  }
}
