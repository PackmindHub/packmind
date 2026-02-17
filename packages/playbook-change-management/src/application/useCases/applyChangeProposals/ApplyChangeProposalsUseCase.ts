import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  ChangeProposalId,
  ChangeProposalType,
  IAccountsPort,
  IPlaybookChangeManagementPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { validateArtefactInSpace } from '../../services/validateArtefactInSpace';

const origin = 'ApplyChangeProposalsUseCase';

const RECIPE_CHANGE_TYPES = [
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
];

const STANDARD_CHANGE_TYPES = [
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
  ChangeProposalType.deleteRule,
];

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

export class ApplyChangeProposalsUseCase<
  T extends StandardId | RecipeId | SkillId,
> extends AbstractMemberUseCase<
  ApplyChangeProposalsCommand<T>,
  ApplyChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly changeProposalService: ChangeProposalService,
    private readonly playbookChangeManagementPort: IPlaybookChangeManagementPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: ApplyChangeProposalsCommand<T> & MemberContext,
  ): Promise<ApplyChangeProposalsResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    await validateArtefactInSpace(
      command.artefactId,
      command.spaceId,
      this.standardsPort,
      this.recipesPort,
      this.skillsPort,
    );

    const allChangeProposalIds = [...command.accepted, ...command.rejected];

    const changeProposals = await Promise.all(
      allChangeProposalIds.map((id) => this.changeProposalService.findById(id)),
    );

    for (const proposal of changeProposals) {
      if (!proposal) {
        continue;
      }

      if (proposal.artefactId !== command.artefactId) {
        throw new Error(
          `Change proposal ${proposal.id} does not belong to artefact ${command.artefactId}`,
        );
      }
    }

    const success: ChangeProposalId[] = [];
    const failure: Array<{ id: ChangeProposalId; message: string }> = [];

    for (const changeProposalId of command.accepted) {
      const proposal = changeProposals.find((p) => p?.id === changeProposalId);

      if (!proposal) {
        failure.push({
          id: changeProposalId,
          message: `Change proposal not found`,
        });
        continue;
      }

      try {
        if (RECIPE_CHANGE_TYPES.includes(proposal.type)) {
          await this.playbookChangeManagementPort.applyCommandChangeProposal({
            userId: command.userId,
            organizationId: command.organizationId,
            spaceId: command.spaceId,
            recipeId: proposal.artefactId as RecipeId,
            changeProposalId: proposal.id,
            force: false,
          });
          success.push(changeProposalId);
        } else if (STANDARD_CHANGE_TYPES.includes(proposal.type)) {
          failure.push({
            id: changeProposalId,
            message: 'Standard change proposals are not supported yet',
          });
        } else if (SKILL_CHANGE_TYPES.includes(proposal.type)) {
          failure.push({
            id: changeProposalId,
            message: 'Skill change proposals are not supported yet',
          });
        } else {
          failure.push({
            id: changeProposalId,
            message: `Unknown change proposal type: ${proposal.type}`,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failure.push({
          id: changeProposalId,
          message,
        });
      }
    }

    for (const changeProposalId of command.rejected) {
      const proposal = changeProposals.find((p) => p?.id === changeProposalId);

      if (!proposal) {
        failure.push({
          id: changeProposalId,
          message: `Change proposal not found`,
        });
        continue;
      }

      try {
        if (RECIPE_CHANGE_TYPES.includes(proposal.type)) {
          await this.playbookChangeManagementPort.rejectCommandChangeProposal({
            userId: command.userId,
            organizationId: command.organizationId,
            spaceId: command.spaceId,
            recipeId: proposal.artefactId as RecipeId,
            changeProposalId: proposal.id,
          });
          success.push(changeProposalId);
        } else if (STANDARD_CHANGE_TYPES.includes(proposal.type)) {
          failure.push({
            id: changeProposalId,
            message: 'Standard change proposals are not supported yet',
          });
        } else if (SKILL_CHANGE_TYPES.includes(proposal.type)) {
          failure.push({
            id: changeProposalId,
            message: 'Skill change proposals are not supported yet',
          });
        } else {
          failure.push({
            id: changeProposalId,
            message: `Unknown change proposal type: ${proposal.type}`,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failure.push({
          id: changeProposalId,
          message,
        });
      }
    }

    this.logger.info('Applied change proposals', {
      artefactId: command.artefactId,
      spaceId: command.spaceId,
      success: success.length,
      failure: failure.length,
    });

    return { success, failure };
  }
}
