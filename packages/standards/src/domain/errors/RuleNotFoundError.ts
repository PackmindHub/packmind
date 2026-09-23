import { RuleId } from '@packmind/types';
import { StandardsError } from './StandardsError';

/**
 * The rule does not exist.
 *
 * For lookups by rule id alone; when a space was asked for, a rule outside it
 * answers `RuleNotInSpaceError` instead, with the same message.
 */
export class RuleNotFoundError extends StandardsError {
  constructor(ruleId: RuleId) {
    super(
      'not_found',
      'rule_not_found',
      { ruleId },
      'This rule does not exist, or you do not have access to it.',
    );
    this.name = 'RuleNotFoundError';
  }
}
