import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  ArtefactVersionId,
  ChangeProposal,
  ChangeProposalStatus,
  ChangeProposalType,
  IAccountsPort,
  IApplyChangeProposalsUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  RecipeId,
  ScalarUpdatePayload,
  SkillId,
  SpaceId,
  StandardId,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { validateArtefactInSpace } from '../../services/validateArtefactInSpace';
import { ChangeProposalConflictError } from '../../../domain/errors/ChangeProposalConflictError';
import { DiffService } from '../../services/DiffService';

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
>
  extends AbstractMemberUseCase<
    ApplyChangeProposalsCommand<T>,
    ApplyChangeProposalsResponse<T>
  >
  implements IApplyChangeProposalsUseCase<T>
{
  private readonly diffService: DiffService;

  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly changeProposalService: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.diffService = new DiffService();
  }

  async executeForMembers(
    command: ApplyChangeProposalsCommand<T> & MemberContext,
  ): Promise<ApplyChangeProposalsResponse<T>> {
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

    // Fetch all proposals
    const changeProposals = await Promise.all(
      allChangeProposalIds.map((id) => this.changeProposalService.findById(id)),
    );

    // Validate all proposals exist, belong to artefact, and are pending
    for (let i = 0; i < changeProposals.length; i++) {
      const proposal = changeProposals[i];
      const proposalId = allChangeProposalIds[i];

      if (!proposal) {
        throw new Error(`Change proposal ${proposalId} not found`);
      }

      if (proposal.artefactId !== command.artefactId) {
        throw new Error(
          `Change proposal ${proposal.id} does not belong to artefact ${command.artefactId}`,
        );
      }

      if (proposal.status !== ChangeProposalStatus.pending) {
        throw new Error(
          `Change proposal ${proposal.id} is not pending (status: ${proposal.status})`,
        );
      }
    }

    // Focus on recipes only - throw error for other types
    for (const proposal of changeProposals) {
      if (!proposal) break;

      if (
        !RECIPE_CHANGE_TYPES.includes(proposal.type) &&
        !STANDARD_CHANGE_TYPES.includes(proposal.type) &&
        !SKILL_CHANGE_TYPES.includes(proposal.type)
      ) {
        throw new Error(`Unknown change proposal type: ${proposal.type}`);
      }

      if (
        STANDARD_CHANGE_TYPES.includes(proposal.type) ||
        SKILL_CHANGE_TYPES.includes(proposal.type)
      ) {
        throw new Error(
          `Change proposal type ${proposal.type} is not supported yet. Only recipe change proposals are supported.`,
        );
      }
    }

    // Get current recipe
    const recipe = await this.recipesPort.getRecipeByIdInternal(
      command.artefactId as RecipeId,
    );
    if (!recipe) {
      throw new Error(`Recipe ${command.artefactId} not found`);
    }

    // Compute all changes in memory (for accepted proposals)
    const updatedFields = { name: recipe.name, content: recipe.content };

    for (const changeProposalId of command.accepted) {
      const proposal = changeProposals.find((p) => p?.id === changeProposalId);

      if (!proposal) {
        throw new Error(`Change proposal ${changeProposalId} not found`);
      }

      const payload = proposal.payload as ScalarUpdatePayload;

      if (proposal.type === ChangeProposalType.updateCommandName) {
        updatedFields.name = payload.newValue;
      } else if (
        proposal.type === ChangeProposalType.updateCommandDescription
      ) {
        const diffResult = this.diffService.applyLineDiff(
          payload.oldValue,
          payload.newValue,
          updatedFields.content,
        );

        if (!diffResult.success) {
          throw new ChangeProposalConflictError(proposal.id);
        }

        updatedFields.content = diffResult.value;
      }
    }

    // Re-validate that all proposals are still pending (fresh from DB)
    // This prevents race conditions where proposals were already processed
    const freshProposals = await Promise.all(
      allChangeProposalIds.map((id) => this.changeProposalService.findById(id)),
    );

    for (let i = 0; i < freshProposals.length; i++) {
      const proposal = freshProposals[i];
      const proposalId = allChangeProposalIds[i];

      if (!proposal) {
        throw new Error(`Change proposal ${proposalId} not found`);
      }

      if (proposal.status !== ChangeProposalStatus.pending) {
        throw new Error(
          `Change proposal ${proposal.id} is not pending (status: ${proposal.status}). It may have been already processed in a previous attempt.`,
        );
      }
    }

    // Now persist everything atomically
    // 1. Update recipe (creates new version) if there are accepted proposals
    let newRecipeVersionNumber: number;

    if (command.accepted.length > 0) {
      const updateResult = await this.recipesPort.updateRecipeFromUI({
        recipeId: recipe.id,
        name: updatedFields.name,
        content: updatedFields.content,
        userId: command.userId as UserId,
        spaceId: command.spaceId as SpaceId,
        organizationId: command.organization.id,
      });

      newRecipeVersionNumber = updateResult.recipe.version;
    } else {
      // No accepted proposals, use current version
      newRecipeVersionNumber = recipe.version;
    }

    // 2. Get the recipe version to return its ID
    const newRecipeVersion = await this.recipesPort.getRecipeVersion(
      recipe.id,
      newRecipeVersionNumber,
    );

    if (!newRecipeVersion) {
      throw new Error(
        `Failed to retrieve recipe version ${newRecipeVersionNumber} for recipe ${recipe.id}`,
      );
    }

    // 3. Mark all proposals as applied/rejected in a single transaction
    // This ensures atomicity - if any proposal update fails, all are rolled back
    const acceptedProposals = command.accepted
      .map((id) => {
        const proposal = changeProposals.find((p) => p?.id === id);
        return proposal ? { proposal, userId: command.userId as UserId } : null;
      })
      .filter(
        (
          item,
        ): item is {
          proposal: ChangeProposal<ChangeProposalType>;
          userId: UserId;
        } => item !== null,
      );

    const rejectedProposals = command.rejected
      .map((id) => {
        const proposal = changeProposals.find((p) => p?.id === id);
        return proposal ? { proposal, userId: command.userId as UserId } : null;
      })
      .filter(
        (
          item,
        ): item is {
          proposal: ChangeProposal<ChangeProposalType>;
          userId: UserId;
        } => item !== null,
      );

    try {
      await this.changeProposalService.batchUpdateProposalsInTransaction({
        acceptedProposals,
        rejectedProposals,
      });
    } catch (error) {
      this.logger.error(
        'Failed to mark change proposals - recipe was updated but proposals remain pending',
        {
          recipeId: recipe.id,
          newVersion: newRecipeVersionNumber,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new Error(
        'Failed to mark change proposals. The recipe was updated successfully, but the proposal statuses could not be changed. Please try again.',
      );
    }

    this.logger.info('Applied change proposals', {
      artefactId: command.artefactId,
      spaceId: command.spaceId,
      accepted: command.accepted.length,
      rejected: command.rejected.length,
      newVersion: newRecipeVersion.id,
    });

    return {
      newArtefactVersion: newRecipeVersion.id as ArtefactVersionId<T>,
    };
  }
}
