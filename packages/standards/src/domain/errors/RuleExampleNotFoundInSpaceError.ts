import { RuleExampleId, SpaceId } from '@packmind/types';
import { StandardsError } from './StandardsError';

/**
 * The rule example does not exist, or it belongs to another space than the
 * one asked for.
 *
 * One error for both, with one message, on purpose: a caller must not be
 * able to tell a rule example outside their space from one that was never
 * there. The space id that was asked for is kept in the context, where only
 * the log sees it.
 */
export class RuleExampleNotFoundInSpaceError extends StandardsError {
  constructor(ruleExampleId: RuleExampleId, spaceId: SpaceId) {
    super(
      'not_found',
      'rule_example_not_found',
      { ruleExampleId, spaceId },
      'This rule example does not exist, or you do not have access to it.',
    );
    this.name = 'RuleExampleNotFoundInSpaceError';
  }
}
