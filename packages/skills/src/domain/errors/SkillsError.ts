import { DomainError, DomainErrorKind } from '@packmind/types';
import { SkillValidationErrorDetail } from './SkillValidationError';

export type SkillsErrorReason =
  | 'skill_parse_failed'
  | 'skill_validation_failed'
  | 'skill_edit_forbidden'
  | 'skill_file_not_editable';

export type SkillsErrorContext = {
  skillId?: string;
  userId?: string;
  skillFilePath?: string;
  validationErrors?: SkillValidationErrorDetail[];
};

/**
 * Base for the skills domain errors, in the same shape as `AccountsError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class SkillsError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: SkillsErrorReason;
  readonly context: SkillsErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: SkillsErrorReason,
    context: SkillsErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'SkillsError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
