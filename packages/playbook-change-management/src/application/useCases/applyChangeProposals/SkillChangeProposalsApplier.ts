import { AbstractChangeProposalsApplier } from './AbstractChangeProposalsApplier';
import {
  ChangeProposal,
  ChangeProposalType,
  ISkillsPort,
  OrganizationId,
  SkillId,
  SkillVersion,
  SpaceId,
  UserId,
} from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';
import { DiffService } from '../../services/DiffService';

const SKILL_CHANGE_TYPES = [
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
  ChangeProposalType.addSkillFile,
  ChangeProposalType.updateSkillFileContent,
  ChangeProposalType.updateSkillFilePermissions,
  ChangeProposalType.deleteSkillFile,
];

export class SkillChangeProposalsApplier extends AbstractChangeProposalsApplier<SkillVersion> {
  constructor(
    diffService: DiffService,
    private readonly skillsPort: ISkillsPort,
  ) {
    super(diffService);
  }

  areChangesApplicable(changeProposals: ChangeProposal[]): boolean {
    return this.checkChangesApplicable(changeProposals, SKILL_CHANGE_TYPES);
  }

  async getVersion(artefactId: SkillId): Promise<SkillVersion> {
    const skillVersion =
      await this.skillsPort.getLatestSkillVersion(artefactId);

    if (!skillVersion) {
      throw new Error(`Unable to find skillVersion with id ${artefactId}.`);
    }

    return skillVersion;
  }

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

  async saveNewVersion(
    skillVersion: SkillVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<SkillVersion> {
    return this.skillsPort.saveSkillVersion({
      skillVersion,
      userId,
      spaceId,
      organizationId,
    });
  }
}
