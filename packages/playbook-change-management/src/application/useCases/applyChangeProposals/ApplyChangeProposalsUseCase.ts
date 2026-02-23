import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  SSEEventPublisher,
} from '@packmind/node-utils';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  ArtefactVersionId,
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  IApplyChangeProposalsUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  RecipeId,
  SkillId,
  StandardId,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { validateArtefactInSpace } from '../../services/validateArtefactInSpace';
import { DiffService } from '../../services/DiffService';
import { CommandChangeProposalsApplier } from './CommandChangeProposalsApplier';
import {
  IChangesProposalApplier,
  ObjectVersions,
} from './IChangesProposalApplier';
import { SkillChangeProposalsApplier } from './SkillChangeProposalsApplier';
import { StandardChangeProposalsApplier } from './StandardChangeProposalsApplier';

const origin = 'ApplyChangeProposalsUseCase';
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

    this.assertAllProposalsValid(
      changeProposals,
      allChangeProposalIds,
      command.artefactId,
    );

    const changesApplier = this.getApplier(changeProposals);
    const currentVersion = await changesApplier.getVersion(command.artefactId);

    const changeProposalsToApply = command.accepted.map((changeProposalId) => {
      const proposal = changeProposals.find((p) => p?.id === changeProposalId);

      if (!proposal) {
        throw new Error(`Change proposal ${changeProposalId} not found`);
      }
      return proposal;
    });

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

    const newVersion = changeProposalsToApply.length
      ? await changesApplier.saveNewVersion(
          changesApplier.applyChangeProposals(
            currentVersion,
            changeProposalsToApply,
          ),
          createUserId(command.userId),
          command.spaceId,
          createOrganizationId(command.organizationId),
        )
      : currentVersion;

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
        'Failed to mark change proposals - object was updated but proposals remain pending',
        {
          newVersionId: newVersion.id,
          newVersion: newVersion.version,
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
      newVersion: newVersion.id,
    });

    SSEEventPublisher.publishChangeProposalUpdateEvent(
      command.organization.id,
      command.spaceId,
    ).catch((error) => {
      this.logger.error('Failed to publish change proposal update SSE event', {
        organizationId: command.organization.id,
        spaceId: command.spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return {
      newArtefactVersion: newVersion.id as ArtefactVersionId<T>,
    };
  }

  private assertAllProposalsValid(
    changeProposals: (ChangeProposal | null)[],
    allChangeProposalIds: ChangeProposalId[],
    artefactId: T,
  ): asserts changeProposals is ChangeProposal[] {
    for (let i = 0; i < changeProposals.length; i++) {
      const proposal = changeProposals[i];
      const proposalId = allChangeProposalIds[i];

      if (!proposal) {
        throw new Error(`Change proposal ${proposalId} not found`);
      }

      if (proposal.artefactId !== artefactId) {
        throw new Error(
          `Change proposal ${proposal.id} does not belong to artefact ${artefactId}`,
        );
      }

      if (proposal.status !== ChangeProposalStatus.pending) {
        throw new Error(
          `Change proposal ${proposal.id} is not pending (status: ${proposal.status})`,
        );
      }
    }
  }

  private getApplier<V extends ObjectVersions>(
    changeProposals: ChangeProposal[],
  ): IChangesProposalApplier<V> {
    const appliers: IChangesProposalApplier<ObjectVersions>[] = [
      new CommandChangeProposalsApplier(this.diffService, this.recipesPort),
      new SkillChangeProposalsApplier(this.diffService, this.skillsPort),
      new StandardChangeProposalsApplier(this.diffService, this.standardsPort),
    ];

    for (const applier of appliers) {
      if (applier.areChangesApplicable(changeProposals)) {
        return applier as IChangesProposalApplier<V>;
      }
    }

    const changeProposalTypes = Array.from(
      new Set(changeProposals.map((cp) => cp.type)),
    ).join(', ');
    throw new Error(
      `Unable to find a valid applier for changes: ${changeProposalTypes}`,
    );
  }
}
