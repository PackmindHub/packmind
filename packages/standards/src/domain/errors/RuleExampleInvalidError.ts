import { StandardsError, StandardsErrorContext } from './StandardsError';

/**
 * The rule example the caller sent cannot be saved as it is: a language left
 * empty, or an update that changes nothing.
 *
 * The message says what to fix and is shown as is, so it names no id; the
 * rule or rule example concerned goes in the context.
 */
export class RuleExampleInvalidError extends StandardsError {
  constructor(
    message: string,
    context: Pick<StandardsErrorContext, 'ruleId' | 'ruleExampleId'> = {},
  ) {
    super('invalid_input', 'rule_example_invalid', context, message);
    this.name = 'RuleExampleInvalidError';
  }
}
