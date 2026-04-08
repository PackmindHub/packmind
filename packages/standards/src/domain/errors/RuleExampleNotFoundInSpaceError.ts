import { RuleExampleId, SpaceId } from '@packmind/types';

export class RuleExampleNotFoundInSpaceError extends Error {
  constructor(ruleExampleId: RuleExampleId, spaceId: SpaceId) {
    super(`Rule example ${ruleExampleId} does not belong to space ${spaceId}`);
    this.name = 'RuleExampleNotFoundInSpaceError';
  }
}
