import {
  AbstractMemberUseCase,
  MemberContext,
  OrganizationAdminRequiredError,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  CreateSpaceCommand,
  CreateSpaceResponse,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';

export class CreateSpaceUseCase extends AbstractMemberUseCase<
  CreateSpaceCommand,
  CreateSpaceResponse
> {
  constructor(
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    protected override readonly logger: PackmindLogger = new PackmindLogger(
      'CreateSpaceUseCase',
    ),
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: CreateSpaceCommand & MemberContext,
  ): Promise<CreateSpaceResponse> {
    const requestedType = command.type ?? SpaceType.private;

    if (
      requestedType !== SpaceType.private &&
      command.membership.role !== 'admin'
    ) {
      throw new OrganizationAdminRequiredError({
        userId: command.userId,
        organizationId: command.organizationId,
      });
    }

    const space = await this.spacesPort.createSpace({
      ...command,
      type: requestedType,
    });

    const userId = createUserId(command.userId);
    await this.spacesPort.addSpaceMembership({
      userId,
      spaceId: space.id,
      role: UserSpaceRole.ADMIN,
      createdBy: userId,
    });

    return space;
  }
}
