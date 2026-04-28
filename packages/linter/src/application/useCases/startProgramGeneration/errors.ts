import { RuleId, StandardId } from '@packmind/types';

export class StandardNotFoundForProgramGenerationError extends Error {
  constructor(standardId: StandardId) {
    super(
      `Standard with id ${String(
        standardId,
      )} not found for program generation.`,
    );
    this.name = 'StandardNotFoundForProgramGenerationError';
  }
}

export class RuleNotFoundForProgramGenerationError extends Error {
  constructor(ruleId: RuleId) {
    super(`Rule with id ${String(ruleId)} not found for program generation.`);
    this.name = 'RuleNotFoundForProgramGenerationError';
  }
}

export class RuleNotLinkedToStandardForProgramGenerationError extends Error {
  constructor(ruleId: RuleId, standardId: StandardId) {
    super(
      `Rule ${String(ruleId)} is not linked to standard ${String(
        standardId,
      )} for program generation.`,
    );
    this.name = 'RuleNotLinkedToStandardForProgramGenerationError';
  }
}

export class UnauthorizedProgramGenerationError extends Error {
  constructor() {
    super('You are not authorized to generate a program for this standard.');
    this.name = 'UnauthorizedProgramGenerationError';
  }
}

export class NoValidLanguagesForProgramGenerationError extends Error {
  constructor(ruleId: RuleId) {
    super(
      `No valid programming languages found for rule ${String(
        ruleId,
      )}. Each language must have at least one example with a non-empty negative case.`,
    );
    this.name = 'NoValidLanguagesForProgramGenerationError';
  }
}

export class NoExamplesForProgramGenerationError extends Error {
  constructor(ruleId: RuleId) {
    super(
      `No examples found for rule ${String(
        ruleId,
      )}. Cannot generate detection program without examples.`,
    );
    this.name = 'NoExamplesForProgramGenerationError';
  }
}
