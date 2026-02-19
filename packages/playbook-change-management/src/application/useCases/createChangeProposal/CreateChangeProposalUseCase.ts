import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  SSEEventPublisher,
} from '@packmind/node-utils';
import {
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  createUserId,
  IAccountsPort,
  ISpacesPort,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { UnsupportedChangeProposalTypeError } from '../../errors/UnsupportedChangeProposalTypeError';
import { IChangeProposalValidator } from '../../validators/IChangeProposalValidator';

const origin = 'CreateChangeProposalUseCase';

export class CreateChangeProposalUseCase extends AbstractMemberUseCase<
  CreateChangeProposalCommand<ChangeProposalType>,
  CreateChangeProposalResponse<ChangeProposalType>
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly service: ChangeProposalService,
    private readonly validators: IChangeProposalValidator[],
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<CreateChangeProposalResponse<ChangeProposalType>> {
    const validator = this.validators.find((v) => v.supports(command.type));
    if (!validator) {
      throw new UnsupportedChangeProposalTypeError(command.type);
    }

    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const { artefactVersion } = await validator.validate(command);

    const existing = await this.service.findExistingPending(
      command.spaceId,
      createUserId(command.userId),
      command.artefactId,
      command.type,
      command.payload,
    );

    if (existing) {
      return { changeProposal: existing, wasCreated: false };
    }

    const { changeProposal } = await this.service.createChangeProposal(
      command,
      artefactVersion,
    );

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

    return { changeProposal, wasCreated: true };
  }
}
