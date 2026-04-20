import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  CreateSpaceCommand,
  CreateSpaceResponse,
  IAccountsPort,
  SpaceCreatedEvent,
} from '@packmind/types';
import { SpaceName } from '../../domain/SpaceName';
import { SpaceService } from '../services/SpaceService';

const origin = 'CreateSpaceUseCase';

export class CreateSpaceUseCase extends AbstractMemberUseCase<
  CreateSpaceCommand,
  CreateSpaceResponse
> {
  constructor(
    private readonly spaceService: SpaceService,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: CreateSpaceCommand & MemberContext,
  ): Promise<CreateSpaceResponse> {
    const spaceName = new SpaceName(command.name);

    const space = await this.spaceService.createSpace(
      spaceName.value,
      createOrganizationId(command.organizationId),
      false,
      command.type,
    );

    this.eventEmitterService.emit(
      new SpaceCreatedEvent({
        userId: createUserId(command.userId),
        organizationId: createOrganizationId(command.organizationId),
        source: command.source ?? 'ui',
        spaceName: space.name,
        spaceSlug: space.slug,
        visibility: space.type,
      }),
    );

    return space;
  }
}
