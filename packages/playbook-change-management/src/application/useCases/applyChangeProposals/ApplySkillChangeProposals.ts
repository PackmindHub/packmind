import { AbstractApplyChangeProposals } from './AbstractApplyChangeProposals';
import {
  ChangeProposal,
  ChangeProposalType,
  OrganizationId,
  SkillVersion,
  SpaceId,
  UserId,
} from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';

export class ApplySkillChangeProposals extends AbstractApplyChangeProposals<SkillVersion> {
  protected applyChangeProposal(
    source: SkillVersion,
    changeProposal: ChangeProposal,
  ): SkillVersion {
    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillName,
      )
    ) {
      return {
        ...source,
        name: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillDescription,
      )
    ) {
      return {
        ...source,
        description: this.applyDiff(
          changeProposal.id,
          changeProposal.payload,
          source.description,
        ),
      };
    }

    throw new Error(`Unsupported ChangeProposalType: ${changeProposal.type}`);
  }

  saveNewVersion(
    version: SkillVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<SkillVersion> {
    return Promise.resolve(undefined);
  }
}
