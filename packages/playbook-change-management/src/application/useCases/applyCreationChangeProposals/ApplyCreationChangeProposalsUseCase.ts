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
  ChangeProposalStatus,
  ChangeProposalType,
  createOrganizationId,
  createUserId,
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
  SupportedCreateChangedProposalType,
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
    SupportedCreateChangedProposalType,
    ICreateChangeProposalApplier<SupportedCreateChangedProposalType>
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

    const allIds = [...command.accepted, ...command.rejected];
    const proposals = await Promise.all(
      allIds.map((id) => this.changeProposalService.findById(id)),
    );

    this.assertAllProposalsValid(proposals, allIds);

    const proposalMap = new Map(proposals.map((p) => [p.id, p]));
    let createdIds: CreatedIds = {
      commands: [],
      standards: [],
      skills: [],
    };
    const createdArtefactIdByProposalId = new Map<ChangeProposalId, string>();

    for (const proposalId of command.accepted) {
      const proposal = proposalMap.get(proposalId);
      if (!proposal) {
        throw new Error(`Change proposal ${proposalId} not found`);
      }
      const applier = this.appliers[proposal.type];

      const artefact = await applier.apply(
        proposal,
        command.spaceId,
        createOrganizationId(command.organizationId),
      );
      createdArtefactIdByProposalId.set(proposalId, artefact.id);
      createdIds = applier.updateCreatedIds(createdIds, artefact);
    }

    const acceptedProposals = command.accepted
      .map((id) => {
        const proposal = proposalMap.get(id);
        return proposal ? { proposal, userId: command.userId as UserId } : null;
      })
      .filter(
        (
          item,
        ): item is {
          proposal: ChangeProposal<SupportedCreateChangedProposalType>;
          userId: UserId;
        } => item !== null,
      );

    const rejectedProposals = command.rejected
      .map((id) => {
        const proposal = proposalMap.get(id);
        return proposal ? { proposal, userId: command.userId as UserId } : null;
      })
      .filter(
        (
          item,
        ): item is {
          proposal: ChangeProposal<SupportedCreateChangedProposalType>;
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
      this.eventEmitterService.emit(
        new ChangeProposalAcceptedEvent({
          userId: createUserId(command.userId),
          organizationId: command.organization.id,
          source: command.source ?? 'ui',
          changeProposalId: proposal.id,
          itemType: getItemTypeFromChangeProposalType(proposal.type),
          itemId: createdArtefactIdByProposalId.get(proposal.id) ?? '',
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
      created: createdIds,
      rejected: command.rejected,
    };
  }

  private assertAllProposalsValid(
    proposals: (ChangeProposal | null)[],
    allIds: ChangeProposalId[],
  ): asserts proposals is ChangeProposal<SupportedCreateChangedProposalType>[] {
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
          `Change proposal ${id} has unsupported type for creation (type: ${proposal.type})`,
        );
      }
    }
  }
}
