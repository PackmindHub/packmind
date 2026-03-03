import { ChangeProposalViolation } from '@packmind/types';

const VIOLATION_MESSAGES: Record<
  ChangeProposalViolation,
  (limit: number, actual: number) => string
> = {
  [ChangeProposalViolation.STANDARD_NAME_TOO_LONG]: (limit, actual) =>
    `Standard name cannot exceed ${limit} characters (got ${actual})`,
  [ChangeProposalViolation.TOO_MANY_RULES]: (limit, actual) =>
    `A standard cannot have more than ${limit} rules (got ${actual})`,
  [ChangeProposalViolation.RULE_CONTENT_TOO_LONG]: (limit, actual) =>
    `Rule content cannot exceed ${limit} characters (got ${actual})`,
  [ChangeProposalViolation.PAYLOAD_MISMATCH]: (limit, actual) =>
    `Payload mismatch (limit: ${limit}, actual: ${actual})`,
  [ChangeProposalViolation.UNSUPPORTED_TYPE]: (limit, actual) =>
    `Unsupported change proposal type (limit: ${limit}, actual: ${actual})`,
  [ChangeProposalViolation.SKILL_FILE_NOT_FOUND]: (limit, actual) =>
    `Skill file not found (limit: ${limit}, actual: ${actual})`,
  [ChangeProposalViolation.SKILL_VERSION_NOT_FOUND]: (limit, actual) =>
    `Skill version not found (limit: ${limit}, actual: ${actual})`,
};

export class ChangeProposalLimitExceededError extends Error {
  readonly changeProposal: ChangeProposalViolation;
  readonly wasCreated = false;

  constructor(
    violation: ChangeProposalViolation,
    limit: number,
    actual: number,
  ) {
    super(VIOLATION_MESSAGES[violation](limit, actual));
    this.name = 'ChangeProposalLimitExceededError';
    this.changeProposal = violation;
  }
}
