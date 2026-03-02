import {
  CreatedIds,
  ICreateChangeProposalApplier,
} from './ICreateChangeProposalApplier';
import {
  ChangeProposal,
  ChangeProposalType,
  IStandardsPort,
  OrganizationId,
  SpaceId,
  Standard,
  UserId,
} from '@packmind/types';

export class StandardCreateChangeProposalApplier implements ICreateChangeProposalApplier<ChangeProposalType.createStandard> {
  constructor(private readonly standardsPort: IStandardsPort) {}

  async apply(
    changeProposal: ChangeProposal<ChangeProposalType.createStandard>,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Standard> {
    const { name, description, scope, rules } = changeProposal.payload;

    // Normalize scope: convert array to string if needed
    const normalizedScope = Array.isArray(scope) ? scope.join(', ') : scope;

    return this.standardsPort.createStandardWithExamples({
      name,
      description,
      summary: null,
      rules: rules.map((rule) => ({ content: rule.content })),
      organizationId,
      userId,
      scope: normalizedScope,
      spaceId,
    });
  }

  updateCreatedIds(createdIds: CreatedIds, standard: Standard): CreatedIds {
    return {
      ...createdIds,
      standards: [...createdIds.standards, standard.id],
    };
  }
}
