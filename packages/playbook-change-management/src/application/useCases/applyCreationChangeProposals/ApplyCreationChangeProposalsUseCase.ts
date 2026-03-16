import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
  SSEEventPublisher,
} from '@packmind/node-utils';
import {
  ApplyCreationChangeProposalsCommand,
  ApplyCreationChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalAcceptedEvent,
  ChangeProposalId,
  ChangeProposalRejectedEvent,
  isChangeProposalEdited,
  ChangeProposalStatus,
  ChangeProposalType,
  createOrganizationId,
  createUserId,
  CreationChangeProposalTypes,
  getItemTypeFromChangeProposalType,
  IAccountsPort,
  IApplyCreationChangeProposalsUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import {
  CreatedIds,
  ICreateChangeProposalApplier,
} from './ICreateChangeProposalApplier';
import { CommandCreateChangeProposalApplier } from './CommandCreateChangeProposalApplier';
import { StandardCreateChangeProposalApplier } from './StandardCreateChangeProposalApplier';
import { SkillCreateChangeProposalApplier } from './SkillCreateChangeProposalApplier';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';

export type {
  ApplyCreationChangeProposalsCommand,
  ApplyCreationChangeProposalsResponse,
};

const origin = 'ApplyCreationChangeProposalsUseCase';

export class ApplyCreationChangeProposalsUseCase
  extends AbstractMemberUseCase<
    ApplyCreationChangeProposalsCommand,
    ApplyCreationChangeProposalsResponse
  >
  implements IApplyCreationChangeProposalsUseCase
{
  private readonly appliers: Record<
    CreationChangeProposalTypes,
    ICreateChangeProposalApplier<CreationChangeProposalTypes>
  >;

  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    recipesPort: IRecipesPort,
    standardsPort: IStandardsPort,
    skillsPort: ISkillsPort,
    private readonly changeProposalService: ChangeProposalService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);

    this.appliers = {
      [ChangeProposalType.createCommand]:
        new CommandCreateChangeProposalApplier(recipesPort),
      [ChangeProposalType.createStandard]:
        new StandardCreateChangeProposalApplier(standardsPort),
      [ChangeProposalType.createSkill]: new SkillCreateChangeProposalApplier(
        skillsPort,
      ),
    };
  }

  async executeForMembers(
    command: ApplyCreationChangeProposalsCommand & MemberContext,
  ): Promise<ApplyCreationChangeProposalsResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const acceptedIds = command.accepted.map((p) => p.id);
    const allIds = [...acceptedIds, ...command.rejected];
    const proposals = await Promise.all(
      allIds.map((id) => this.changeProposalService.findById(id)),
    );

    this.assertProposalsAreCreationProposal(command.accepted);
    this.assertAllProposalsValid(proposals, allIds);

    const proposalMap = new Map(proposals.map((p) => [p.id, p]));
    let createdIds: CreatedIds = {
      commands: [],
      standards: [],
      skills: [],
    };
    const createdArtefactIdByProposalId = new Map<ChangeProposalId, string>();

    for (const acceptedProposal of command.accepted) {
      const dbProposal = proposalMap.get(acceptedProposal.id);
      if (!dbProposal) {
        throw new Error(
          `Change proposal ${acceptedProposal.id} not found in database`,
        );
      }

      // Validate that the proposal from command matches the one in DB
      this.assertProposalMatchesDatabase(acceptedProposal, dbProposal);

      const applier = this.appliers[acceptedProposal.type];

      const artefact = await applier.apply(
        acceptedProposal,
        command.spaceId,
        createOrganizationId(command.organizationId),
      );
      createdArtefactIdByProposalId.set(acceptedProposal.id, artefact.id);
      createdIds = applier.updateCreatedIds(createdIds, artefact);
    }

    const acceptedProposals = command.accepted.map((proposal) => ({
      proposal,
      userId: command.userId as UserId,
    }));

    const rejectedProposals = command.rejected
      .map((id) => {
        const proposal = proposalMap.get(id);
        return proposal ? { proposal, userId: command.userId as UserId } : null;
      })
      .filter(
        (
          item,
        ): item is {
          proposal: ChangeProposal<CreationChangeProposalTypes>;
          userId: UserId;
        } => item !== null,
      );

    await this.changeProposalService.batchUpdateProposalsInTransaction({
      acceptedProposals,
      rejectedProposals,
    });

    this.logger.info('Applied creation change proposals', {
      spaceId: command.spaceId,
      accepted: command.accepted.length,
      rejected: command.rejected.length,
      createdCommands: createdIds.commands.length,
      createdStandards: createdIds.standards.length,
      createdSkills: createdIds.skills.length,
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
      const createdArtefactId = createdArtefactIdByProposalId.get(proposal.id);
      if (!createdArtefactId) {
        throw new Error(
          `Created artefact ID not found for proposal ${proposal.id}`,
        );
      }

      this.eventEmitterService.emit(
        new ChangeProposalAcceptedEvent({
          userId: createUserId(command.userId),
          organizationId: command.organization.id,
          source: command.source ?? 'ui',
          changeProposalId: proposal.id,
          itemType: getItemTypeFromChangeProposalType(proposal.type),
          itemId: createdArtefactId,
          changeType: proposal.type,
          edited: isChangeProposalEdited(proposal.type, proposal.decision),
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
          // creation proposals have no artefactId before they are applied — empty string is correct for rejections
          itemId: String(proposal.artefactId ?? ''),
          changeType: proposal.type,
        }),
      );
    }

    return {
      created: createdIds,
      rejected: command.rejected,
    };
  }

  private assertProposalsAreCreationProposal(
    proposals: ChangeProposal[],
  ): asserts proposals is ChangeProposal<CreationChangeProposalTypes>[] {
    for (const proposal of proposals) {
      this.assertProposalIsCreationProposal(proposal);
    }
  }

  private assertAllProposalsValid(
    proposals: (ChangeProposal | null)[],
    allIds: ChangeProposalId[],
  ): asserts proposals is ChangeProposal<CreationChangeProposalTypes>[] {
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      const id = allIds[i];

      if (!proposal) {
        throw new Error(`Change proposal ${id} not found`);
      }

      if (proposal.status !== ChangeProposalStatus.pending) {
        throw new Error(
          `Change proposal ${id} is not pending (status: ${proposal.status})`,
        );
      }

      this.assertProposalIsCreationProposal(proposal);
    }
  }

  private assertProposalIsCreationProposal(
    proposal: ChangeProposal,
  ): asserts proposal is ChangeProposal<CreationChangeProposalTypes> {
    if (
      !isExpectedChangeProposalType(
        proposal,
        ChangeProposalType.createCommand,
      ) &&
      !isExpectedChangeProposalType(
        proposal,
        ChangeProposalType.createStandard,
      ) &&
      !isExpectedChangeProposalType(proposal, ChangeProposalType.createSkill)
    ) {
      throw new Error(
        `Change proposal ${proposal.id} has unsupported type for creation (type: ${proposal.type})`,
      );
    }
  }

  private assertProposalMatchesDatabase(
    acceptedProposal: ChangeProposal<CreationChangeProposalTypes>,
    dbProposal: ChangeProposal<CreationChangeProposalTypes>,
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
