export enum ChangeProposalViolation {
  // Standard limit violations (enforced in StandardChangeProposalValidator)
  STANDARD_NAME_TOO_LONG = 'STANDARD_NAME_TOO_LONG',
  TOO_MANY_RULES = 'TOO_MANY_RULES',
  RULE_CONTENT_TOO_LONG = 'RULE_CONTENT_TOO_LONG',

  // Existing violation categories (for future error retrofitting)
  PAYLOAD_MISMATCH = 'PAYLOAD_MISMATCH',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  SKILL_FILE_NOT_FOUND = 'SKILL_FILE_NOT_FOUND',
  SKILL_VERSION_NOT_FOUND = 'SKILL_VERSION_NOT_FOUND',
}
