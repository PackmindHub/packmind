import { RuleId } from '@packmind/types';

export class RuleNotFoundError extends Error {
  constructor(ruleId: RuleId) {
    super(`Rule with id ${ruleId} not found`);
    this.name = 'RuleNotFoundError';
  }
}
