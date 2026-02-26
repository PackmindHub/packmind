import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse,
  ChangeProposalType,
  IAccountsPort,
  createUserId,
  CreateChangeProposalCommand,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { IChangeProposalValidator } from '../../validators/IChangeProposalValidator';

const origin = 'CheckChangeProposalsUseCase';

export class CheckChangeProposalsUseCase extends AbstractMemberUseCase<
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly changeProposalService: ChangeProposalService,
    private readonly validators: IChangeProposalValidator[],
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CheckChangeProposalsCommand & MemberContext,
  ): Promise<CheckChangeProposalsResponse> {
    this.logger.info('Checking existing change proposals', {
      spaceId: command.spaceId,
      count: command.proposals.length,
    });

    const results = await Promise.all(
      command.proposals.map(async (proposal, index) => {
        let payload = proposal.payload;

        const validator = this.validators.find((v) =>
          v.supports(proposal.type as ChangeProposalType),
        );

        if (validator) {
          try {
            const validationCommand = {
              userId: command.userId,
              organizationId: command.organizationId,
              spaceId: command.spaceId,
              type: proposal.type as ChangeProposalType,
              artefactId: proposal.artefactId,
              payload: proposal.payload,
              captureMode: proposal.captureMode,
              message: proposal.message,
              user: command.user,
              organization: command.organization,
              membership: command.membership,
            } as CreateChangeProposalCommand<ChangeProposalType> &
              MemberContext;

            const { resolvedPayload } =
              await validator.validate(validationCommand);
            payload = resolvedPayload ?? payload;
          } catch {
            return {
              index,
              exists: false,
              createdAt: null,
              message: null,
            };
          }
        }

        const existing = await this.changeProposalService.findExistingPending(
          command.spaceId,
          createUserId(command.userId),
          proposal.artefactId,
          proposal.type as ChangeProposalType,
          payload,
        );

        return {
          index,
          exists: existing !== null,
          createdAt: existing?.createdAt.toISOString() ?? null,
          message: existing?.message ?? null,
        };
      }),
    );

    this.logger.info('Change proposals check completed', {
      spaceId: command.spaceId,
      total: command.proposals.length,
      existing: results.filter((r) => r.exists).length,
    });

    return { results };
  }
}
