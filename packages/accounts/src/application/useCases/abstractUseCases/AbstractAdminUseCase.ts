import {
  IUseCase,
  PackmindCommand,
  PackmindLogger,
  PackmindResult,
} from '@packmind/shared';
import { DataSource } from 'typeorm';
import { IAccountsServices } from '../../IAccountsServices';
import { EnhancedAccountsServices } from '../../services/EnhancedAccountsServices';
import { createUserId } from '../../../domain/entities/User';
import { createOrganizationId } from '../../../domain/entities/Organization';

// That's awfully ugly and should be injected somehow, but I don't know how yet...
import { AccountsRepository } from '../../../infra/repositories/AccountsRepository';

const origin = 'AbstractAdminUseCase';

export abstract class AbstractAdminUseCase<
  Command extends PackmindCommand,
  Result extends PackmindResult,
> implements IUseCase<Command, Result>
{
  private readonly accountsServices: IAccountsServices;
  private readonly logger: PackmindLogger;

  constructor(
    private readonly dataSource: DataSource,
    logger = new PackmindLogger(origin),
  ) {
    this.logger = logger;
    const accountsRepository = new AccountsRepository(this.dataSource);
    this.accountsServices = new EnhancedAccountsServices(
      accountsRepository,
      logger,
    );
  }

  async execute(command: Command): Promise<Result> {
    const { userId, organizationId } = command;

    const userService = this.accountsServices.getUserService();
    const user = await userService.getUserById(createUserId(userId));

    if (!user) {
      this.logger.error('User not found', { userId });
      throw new Error('User not found');
    }

    const userMembership = user.memberships.find(
      (membership) =>
        membership.organizationId === createOrganizationId(organizationId),
    );

    if (!userMembership) {
      this.logger.error('User does not belong to organization', {
        userId,
        organizationId,
      });
      throw new Error('User does not belong to the organization');
    }

    if (userMembership.role !== 'admin') {
      this.logger.error('User is not an admin', {
        userId,
        organizationId,
        role: userMembership.role,
      });
      throw new Error('User must be an admin to perform this action');
    }

    this.logger.info('Admin validation successful', { userId, organizationId });
    return this.executeForAdmins(command);
  }

  abstract executeForAdmins(command: Command): Promise<Result>;
}
