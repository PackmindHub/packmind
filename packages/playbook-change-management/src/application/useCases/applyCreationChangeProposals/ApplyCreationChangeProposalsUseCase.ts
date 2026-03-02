import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  SSEEventPublisher,
} from '@packmind/node-utils';
import {
  ApplyCreationChangeProposalsCommand,
  ApplyCreationChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  IApplyCreationChangeProposalsUseCase,
  IRecipesPort,
  ISpacesPort,
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
    private readonly changeProposalService: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);

    this.appliers = {
      [ChangeProposalType.createCommand]:
        new CommandCreateChangeProposalApplier(recipesPort),
      [ChangeProposalType.createStandard]:
        new StandardCreateChangeProposalApplier(),
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

    for (const proposalId of command.accepted) {
      const proposal = proposalMap.get(proposalId);
      if (!proposal) {
        throw new Error(`Change proposal ${proposalId} not found`);
      }
      const applier = this.appliers[proposal.type];

      const artefact = await applier.apply(
        proposal,
        createUserId(command.userId),
        command.spaceId,
        createOrganizationId(command.organizationId),
      );
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
      created: createdIds.commands.length,
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
      created: createdIds,
      rejected: command.rejected,
    };
  }

  private assertAllProposalsValid(
    proposals: (ChangeProposal<ChangeProposalType> | null)[],
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

      if (proposal.type !== ChangeProposalType.createCommand) {
        throw new Error(
          `Change proposal ${id} is not a createCommand proposal (type: ${proposal.type})`,
        );
      }
    }
  }
}
