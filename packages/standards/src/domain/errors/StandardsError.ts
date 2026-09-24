import { DomainError, DomainErrorKind } from '@packmind/types';

export type StandardsErrorReason =
  | 'rule_not_found'
  | 'rule_example_not_found'
  | 'space_not_accessible'
  | 'standard_not_found'
  | 'rule_example_invalid'
  | 'space_required'
  | 'multiple_packages_requested';

export type StandardsErrorContext = {
  standardId?: string;
  standardSlug?: string;
  ruleId?: string;
  ruleExampleId?: string;
  spaceId?: string;
  organizationId?: string;
  packageSlugs?: string[];
};

/**
 * Base for the standards domain errors, in the same shape as `SkillsError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class StandardsError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: StandardsErrorReason;
  readonly context: StandardsErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: StandardsErrorReason,
    context: StandardsErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'StandardsError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
