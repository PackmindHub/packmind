import { RuleExampleId } from '@packmind/types';
import { StandardsError } from './StandardsError';

/**
 * The rule example does not exist.
 *
 * For lookups by rule example id alone; when a space was asked for, a rule
 * example outside it answers `RuleExampleNotFoundInSpaceError` instead, with
 * the same message.
 */
export class RuleExampleNotFoundError extends StandardsError {
  constructor(ruleExampleId: RuleExampleId) {
    super(
      'not_found',
      'rule_example_not_found',
      { ruleExampleId },
      'This rule example does not exist, or you do not have access to it.',
    );
    this.name = 'RuleExampleNotFoundError';
  }
}
