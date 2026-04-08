import { RuleId, SpaceId } from '@packmind/types';

export class RuleNotInSpaceError extends Error {
  constructor(ruleId: RuleId, spaceId: SpaceId) {
    super(`Rule ${ruleId} does not belong to space ${spaceId}`);
    this.name = 'RuleNotInSpaceError';
  }
}
