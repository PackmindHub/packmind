/**
 * Represents a code example from the legacy practice format.
 */
export interface LegacyCodeExample {
  code: string;
  language: string;
}

/**
 * Represents a detection program from the legacy practice format.
 * Detection programs contain JavaScript code that can detect violations of a rule.
 */
export interface LegacyDetectionProgram {
  code: string;
  description: string;
  language: string;
  mode: 'AST' | 'RAW';
}

/**
 * Represents a rule from the legacy practice format.
 * Rules have a name and separate arrays of positive and negative examples.
 */
export interface LegacyRule {
  name: string;
  positiveExamples: LegacyCodeExample[];
  negativeExamples: LegacyCodeExample[];
  detectionProgram?: LegacyDetectionProgram;
}

/**
 * Represents a standard from the legacy practice format.
 * A standard contains a name, description, and a list of rules.
 */
export interface LegacyStandard {
  name: string;
  description: string;
  rules: LegacyRule[];
}

/**
 * Represents the root structure of the legacy practice input JSON.
 */
export interface LegacyPracticeInput {
  standards: LegacyStandard[];
}
