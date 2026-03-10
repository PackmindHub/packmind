import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
  SSEEventPublisher,
} from '@packmind/node-utils';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  ArtefactVersionId,
  ChangeProposal,
  ChangeProposalAcceptedEvent,
  ChangeProposalId,
  ChangeProposalRejectedEvent,
  ChangeProposalStatus,
  ChangeProposalType,
  createOrganizationId,
  createUserId,
  getItemTypeFromChangeProposalType,
  IAccountsPort,
  IApplyChangeProposalsUseCase,
  IDeploymentPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  PackageId,
  RecipeId,
  SkillId,
  StandardId,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { validateArtefactInSpace } from '../../services/validateArtefactInSpace';
import { DiffService } from '@packmind/types';
import { CommandChangesApplier } from './CommandChangesApplier';
import {
  IChangesProposalApplier,
  ObjectVersions,
} from './IChangesProposalApplier';
import { SkillChangesApplier } from './SkillChangesApplier';
import { StandardChangesApplier } from './StandardChangesApplier';

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
    private readonly deploymentPort: IDeploymentPort,
    private readonly changeProposalService: ChangeProposalService,
    private readonly eventEmitterService: PackmindEventEmitterService,
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

    const acceptedIds = command.accepted.map((p) => p.id);
    const allChangeProposalIds = [...acceptedIds, ...command.rejected];

    // Fetch all proposals
    const changeProposals = await Promise.all(
      allChangeProposalIds.map((id) => this.changeProposalService.findById(id)),
    );

    this.assertAllProposalsValid(
      changeProposals,
      allChangeProposalIds,
      command.artefactId,
    );

    const proposalMap = new Map(
      changeProposals.map((p) => [p?.id, p] as const),
    );

    // Validate that proposals from command match those in DB
    for (const acceptedProposal of command.accepted) {
      const dbProposal = proposalMap.get(acceptedProposal.id);
      if (!dbProposal) {
        throw new Error(
          `Change proposal ${acceptedProposal.id} not found in database`,
        );
      }
      this.assertProposalMatchesDatabase(acceptedProposal, dbProposal);
    }

    const changesApplier = this.getApplier(changeProposals);
    const currentVersion = await changesApplier.getVersion(command.artefactId);

    const changeProposalsToApply = command.accepted.map((acceptedProposal) => {
      const proposal = proposalMap.get(acceptedProposal.id);

      if (!proposal) {
        throw new Error(
          `Change proposal ${acceptedProposal.id} not found in database`,
        );
      }
      return acceptedProposal;
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

    const appliedChangesProposalsResponse = changesApplier.applyChangeProposals(
      currentVersion,
      changeProposalsToApply,
    );

    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);
    let newVersion = currentVersion;
    let artefactDeleted = false;
    const updatedPackages: PackageId[] = [];

    if (appliedChangesProposalsResponse.delete) {
      await changesApplier.deleteArtefact(
        currentVersion,
        userId,
        command.spaceId,
        organizationId,
      );
      try {
        await this.changeProposalService.cancelPendingByArtefactId(
          command.spaceId,
          command.artefactId,
          userId,
        );
      } catch (error) {
        this.logger.warn(
          'Failed to cancel pending proposals after artefact deletion — orphaned proposals may remain',
          {
            artefactId: command.artefactId,
            spaceId: command.spaceId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
      artefactDeleted = true;
    } else {
      const REMOVAL_PROPOSAL_TYPES = [
        ChangeProposalType.removeCommand,
        ChangeProposalType.removeStandard,
        ChangeProposalType.removeSkill,
      ] as const;

      const hasContentChanges = changeProposalsToApply.some(
        (p) =>
          !REMOVAL_PROPOSAL_TYPES.includes(
            p.type as (typeof REMOVAL_PROPOSAL_TYPES)[number],
          ),
      );

      if (hasContentChanges) {
        newVersion = await changesApplier.saveNewVersion(
          appliedChangesProposalsResponse.version,
          userId,
          command.spaceId,
          organizationId,
        );
      }

      for (const packageId of appliedChangesProposalsResponse.removeFromPackages) {
        const { package: pkg } = await this.deploymentPort.getPackageById({
          packageId,
          organizationId,
          spaceId: command.spaceId,
          userId,
        });
        const artefactIds =
          changesApplier.getUpdatePackageCommandWithoutArtefact(
            currentVersion,
            pkg,
          );
        await this.deploymentPort.updatePackage({
          packageId,
          spaceId: pkg.spaceId,
          name: pkg.name,
          description: pkg.description,
          ...artefactIds,
          userId,
          organizationId,
        });
        updatedPackages.push(packageId);
      }
    }

    // 3. Mark all proposals as applied/rejected in a single transaction
    // This ensures atomicity - if any proposal update fails, all are rolled back
    const acceptedProposals = command.accepted.map((proposal) => ({
      proposal,
      userId: command.userId as UserId,
    }));

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
        'Failed to mark change proposals - artefact was modified but proposals remain pending',
        {
          artefactDeleted,
          ...(artefactDeleted
            ? {}
            : { newVersionId: newVersion.id, newVersion: newVersion.version }),
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new Error(
        artefactDeleted
          ? 'Failed to mark change proposals. The artefact was deleted but proposal statuses could not be updated. Please contact support.'
          : 'Failed to mark change proposals. The artefact was updated successfully, but the proposal statuses could not be changed. Please try again.',
      );
    }

    this.logger.info('Applied change proposals', {
      artefactId: command.artefactId,
      spaceId: command.spaceId,
      accepted: command.accepted.length,
      rejected: command.rejected.length,
      artefactDeleted,
      newVersion: artefactDeleted ? undefined : newVersion.id,
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

    for (const { proposal } of acceptedProposals) {
      this.eventEmitterService.emit(
        new ChangeProposalAcceptedEvent({
          userId: createUserId(command.userId),
          organizationId: command.organization.id,
          source: command.source ?? 'ui',
          changeProposalId: proposal.id,
          itemType: getItemTypeFromChangeProposalType(proposal.type),
          itemId: String(proposal.artefactId ?? ''),
          changeType: proposal.type,
        }),
      );
    }

    for (const { proposal } of rejectedProposals) {
      this.eventEmitterService.emit(
        new ChangeProposalRejectedEvent({
          userId: createUserId(command.userId),
          organizationId: command.organization.id,
          source: command.source ?? 'ui',
          changeProposalId: proposal.id,
          itemType: getItemTypeFromChangeProposalType(proposal.type),
          itemId: String(proposal.artefactId ?? ''),
          changeType: proposal.type,
        }),
      );
    }

    return {
      newArtefactVersion: artefactDeleted
        ? undefined
        : (newVersion.id as ArtefactVersionId<T>),
      updatedPackages: updatedPackages.length ? updatedPackages : undefined,
      artefactDeleted: artefactDeleted || undefined,
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
      new CommandChangesApplier(this.diffService, this.recipesPort),
      new SkillChangesApplier(this.diffService, this.skillsPort),
      new StandardChangesApplier(this.diffService, this.standardsPort),
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

  private assertProposalMatchesDatabase(
    acceptedProposal: ChangeProposal<ChangeProposalType>,
    dbProposal: ChangeProposal<ChangeProposalType>,
  ): void {
    if (acceptedProposal.type !== dbProposal.type) {
      throw new Error(
        `Change proposal ${acceptedProposal.id} type mismatch: expected ${dbProposal.type}, got ${acceptedProposal.type}`,
      );
    }

    if (
      JSON.stringify(acceptedProposal.payload) !==
      JSON.stringify(dbProposal.payload)
    ) {
      throw new Error(
        `Change proposal ${acceptedProposal.id} payload mismatch`,
      );
    }
  }
}
