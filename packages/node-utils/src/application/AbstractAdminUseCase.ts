import { PackmindCommand, PackmindResult } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { UserProvider, OrganizationProvider } from '@packmind/types';
import {
  UserAccessError,
  OrganizationAdminRequiredError,
} from './UserAccessErrors';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';

const defaultOrigin = 'AbstractAdminUseCase';

export type AdminContext = MemberContext;

export abstract class AbstractAdminUseCase<
  Command extends PackmindCommand,
  Result extends PackmindResult,
> extends AbstractMemberUseCase<Command, Result> {
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    logger: PackmindLogger = new PackmindLogger(defaultOrigin),
  ) {
    super(userProvider, organizationProvider, logger);
  }

  protected override executeForMembers(
    command: Command & MemberContext,
  ): Promise<Result> {
    return this.executeForAdmins(command);
  }

  protected override handleValidationError(
    error: UserAccessError,
    command: Command,
  ): Error | never {
    this.logger.error('Admin validation failed', {
      userId: command.userId,
      organizationId: command.organizationId,
      reason: error.reason,
    });

    if (error.reason === 'user_not_an_admin') {
      const organizationId = error.context.organizationId;
      if (!organizationId) {
        throw new Error(
          'Organization ID is required for admin access operations',
        );
      }

      return new OrganizationAdminRequiredError({
        userId: error.context.userId,
        organizationId,
      });
    }

    return super.handleValidationError(error, command);
  }

  protected override async validateMemberAccess(
    command: Command,
  ): Promise<MemberContext> {
    const context = await super.validateMemberAccess(command);

    if (context.membership.role !== 'admin') {
      throw new OrganizationAdminRequiredError({
        userId: command.userId,
        organizationId: command.organizationId,
      });
    }

    return context;
  }

  protected abstract executeForAdmins(
    command: Command & AdminContext,
  ): Promise<Result>;
}
