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
  createUserId,
  getItemTypeFromChangeProposalType,
  IAccountsPort,
  IEventTrackingPort,
  IRecipesPort,
  ISpacesPort,
  NewCommandPayload,
  RecipeId,
  UserId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';

export type {
  ApplyCreationChangeProposalsCommand,
  ApplyCreationChangeProposalsResponse,
};

const origin = 'ApplyCreationChangeProposalsUseCase';

export class ApplyCreationChangeProposalsUseCase extends AbstractMemberUseCase<
  ApplyCreationChangeProposalsCommand,
  ApplyCreationChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly recipesPort: IRecipesPort,
    private readonly changeProposalService: ChangeProposalService,
    private readonly eventTrackingPort: IEventTrackingPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
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

    const created: RecipeId[] = [];

    for (const proposalId of command.accepted) {
      const proposal = proposalMap.get(proposalId);
      if (!proposal) {
        throw new Error(`Change proposal ${proposalId} not found`);
      }
      const payload = proposal.payload as NewCommandPayload;

      const recipe = await this.recipesPort.captureRecipe({
        userId: command.userId,
        organizationId: command.organizationId,
        spaceId: command.spaceId,
        name: payload.name,
        content: payload.content,
      });

      created.push(recipe.id);
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
          proposal: ChangeProposal<ChangeProposalType>;
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
          proposal: ChangeProposal<ChangeProposalType>;
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
      created: created.length,
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
      this.eventTrackingPort
        .trackEvent(
          createUserId(command.userId),
          command.organization.id,
          'change_proposal_accepted',
          {
            itemType: getItemTypeFromChangeProposalType(proposal.type),
            itemId: String(proposal.artefactId ?? ''),
            changeType: proposal.type,
          },
        )
        .catch((error) => {
          this.logger.error('Failed to track change_proposal_accepted event', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }

    for (const { proposal } of rejectedProposals) {
      this.eventTrackingPort
        .trackEvent(
          createUserId(command.userId),
          command.organization.id,
          'change_proposal_rejected',
          {
            itemType: getItemTypeFromChangeProposalType(proposal.type),
            itemId: String(proposal.artefactId ?? ''),
            changeType: proposal.type,
          },
        )
        .catch((error) => {
          this.logger.error('Failed to track change_proposal_rejected event', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }

    return {
      created,
      rejected: command.rejected,
    };
  }

  private assertAllProposalsValid(
    proposals: (ChangeProposal<ChangeProposalType> | null)[],
    allIds: ChangeProposalId[],
  ): asserts proposals is ChangeProposal<ChangeProposalType>[] {
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
