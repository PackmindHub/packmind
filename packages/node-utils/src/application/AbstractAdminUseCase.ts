import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  PackmindCommand,
  PackmindResult,
} from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';
import {
  OrganizationAdminRequiredError,
  UserAccessError,
} from './UserAccessErrors';

const defaultOrigin = 'AbstractAdminUseCase';

export type AdminContext = MemberContext;

export abstract class AbstractAdminUseCase<
  Command extends PackmindCommand,
  Result extends PackmindResult,
> extends AbstractMemberUseCase<Command, Result> {
  constructor(
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(defaultOrigin),
  ) {
    super(accountsPort, logger);
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
