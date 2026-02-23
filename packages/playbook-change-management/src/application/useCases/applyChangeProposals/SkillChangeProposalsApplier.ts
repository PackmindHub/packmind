import { AbstractChangeProposalsApplier } from './AbstractChangeProposalsApplier';
import {
  ChangeProposal,
  ChangeProposalType,
  ISkillsPort,
  OrganizationId,
  SkillId,
  SpaceId,
  UserId,
  createSkillFileId,
} from '@packmind/types';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';
import { DiffService } from '../../services/DiffService';
import { SkillVersionWithFiles } from './IChangesProposalApplier';

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

export class SkillChangeProposalsApplier extends AbstractChangeProposalsApplier<SkillVersionWithFiles> {
  constructor(
    diffService: DiffService,
    private readonly skillsPort: ISkillsPort,
  ) {
    super(diffService);
  }

  areChangesApplicable(changeProposals: ChangeProposal[]): boolean {
    return this.checkChangesApplicable(changeProposals, SKILL_CHANGE_TYPES);
  }

  async getVersion(artefactId: SkillId): Promise<SkillVersionWithFiles> {
    const skillVersion =
      await this.skillsPort.getLatestSkillVersion(artefactId);

    if (!skillVersion) {
      throw new Error(`Unable to find skillVersion with id ${artefactId}.`);
    }

    const skillVersionsFiles = await this.skillsPort.getSkillFiles(
      skillVersion.id,
    );

    return {
      ...skillVersion,
      files: skillVersionsFiles,
    };
  }

  protected applyChangeProposal(
    source: SkillVersionWithFiles,
    changeProposal: ChangeProposal,
  ): SkillVersionWithFiles {
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

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillPrompt,
      )
    ) {
      return {
        ...source,
        prompt: this.applyDiff(
          changeProposal.id,
          changeProposal.payload,
          source.prompt,
        ),
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillMetadata,
      )
    ) {
      return {
        ...source,
        metadata: changeProposal.payload.newValue
          ? JSON.parse(changeProposal.payload.newValue)
          : undefined,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillLicense,
      )
    ) {
      return {
        ...source,
        license: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillCompatibility,
      )
    ) {
      return {
        ...source,
        compatibility: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillAllowedTools,
      )
    ) {
      return {
        ...source,
        allowedTools: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.addSkillFile,
      )
    ) {
      const newFile = {
        ...changeProposal.payload.item,
        id: createSkillFileId(''),
        skillVersionId: source.id,
      };

      return {
        ...source,
        files: [...(source.files || []), newFile],
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillFileContent,
      )
    ) {
      const files = source.files || [];
      const updatedFiles = files.map((file) => {
        if (file.id !== changeProposal.payload.targetId) {
          return file;
        }

        const updatedContent = this.applyDiff(
          changeProposal.id,
          changeProposal.payload,
          file.content,
        );

        return {
          ...file,
          content: updatedContent,
          ...(changeProposal.payload.isBase64 !== undefined && {
            isBase64: changeProposal.payload.isBase64,
          }),
        };
      });

      return {
        ...source,
        files: updatedFiles,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillFilePermissions,
      )
    ) {
      const files = source.files || [];
      const updatedFiles = files.map((file) => {
        if (file.id !== changeProposal.payload.targetId) {
          return file;
        }

        return {
          ...file,
          permissions: changeProposal.payload.newValue,
        };
      });

      return {
        ...source,
        files: updatedFiles,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.deleteSkillFile,
      )
    ) {
      const files = source.files || [];
      const filteredFiles = files.filter(
        (file) => file.id !== changeProposal.payload.targetId,
      );

      return {
        ...source,
        files: filteredFiles,
      };
    }

    throw new Error(`Unsupported ChangeProposalType: ${changeProposal.type}`);
  }

  async saveNewVersion(
    skillVersion: SkillVersionWithFiles,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<SkillVersionWithFiles> {
    const newVersion = await this.skillsPort.saveSkillVersion({
      skillVersion,
      userId,
      spaceId,
      organizationId,
    });

    return {
      ...newVersion,
      files: await this.skillsPort.getSkillFiles(newVersion.id),
    };
  }
}
