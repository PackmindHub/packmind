import { IUseCase, PackmindCommand, PackmindResult } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  Organization,
  OrganizationId,
} from '@packmind/types';
import {
  createUserId,
  User,
  UserId,
  UserOrganizationMembership,
} from '@packmind/types';
import { UserProvider, OrganizationProvider } from '@packmind/types';
import {
  UserAccessError,
  UserAccessErrorContext,
  OrganizationContext,
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';

const defaultOrigin = 'AbstractMemberUseCase';

export type MemberContext = {
  user: User;
  organization: Organization;
  membership: UserOrganizationMembership;
};

export abstract class AbstractMemberUseCase<
  Command extends PackmindCommand,
  Result extends PackmindResult,
> implements IUseCase<Command, Result>
{
  protected readonly userProvider: UserProvider;
  protected readonly organizationProvider: OrganizationProvider;
  protected readonly logger: PackmindLogger;

  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    logger: PackmindLogger = new PackmindLogger(defaultOrigin),
  ) {
    this.userProvider = userProvider;
    this.organizationProvider = organizationProvider;
    this.logger = logger;
  }

  async execute(command: Command): Promise<Result> {
    let context: MemberContext;

    try {
      context = await this.validateMemberAccess(command);
    } catch (error) {
      if (error instanceof UserAccessError) {
        throw this.handleValidationError(error, command);
      }

      throw error;
    }

    this.logger.info('Member validation successful', {
      userId: command.userId,
      organizationId: command.organizationId,
    });

    return this.executeForMembers({ ...command, ...context });
  }

  protected handleValidationError(
    error: UserAccessError,
    command: Command,
  ): Error | never {
    this.logger.error('Member validation failed', {
      userId: command.userId,
      organizationId: command.organizationId,
      reason: error.reason,
    });

    return this.translateUserAccessError(error);
  }

  protected abstract executeForMembers(
    command: Command & MemberContext,
  ): Promise<Result>;

  private translateUserAccessError(error: UserAccessError): Error {
    const { userId, organizationId } = error.context;

    switch (error.reason) {
      case 'user_not_found':
        return new UserNotFoundError({ userId, organizationId });
      case 'user_not_in_organization':
        return new UserNotInOrganizationError(
          this.toOrganizationContext({ userId, organizationId }),
        );
      default:
        return error;
    }
  }

  protected async validateMemberAccess(
    command: Command,
  ): Promise<MemberContext> {
    const context: UserAccessErrorContext = {
      userId: command.userId,
      organizationId: command.organizationId,
    };

    const user = await this.fetchUser(createUserId(command.userId), context);
    const organizationId = createOrganizationId(command.organizationId);
    const membership = this.findMembership(user, organizationId, context);

    const organization = await this.fetchOrganization(organizationId);

    return { user, organization, membership };
  }

  private async fetchOrganization(
    organizationId: OrganizationId,
  ): Promise<Organization> {
    const organization =
      await this.organizationProvider.getOrganizationById(organizationId);

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    return organization;
  }

  private async fetchUser(
    userId: UserId,
    context: UserAccessErrorContext,
  ): Promise<User> {
    const user = await this.userProvider.getUserById(userId);

    if (!user) {
      throw new UserNotFoundError(context);
    }

    return user;
  }

  private findMembership(
    user: User,
    organizationId: OrganizationId,
    context: UserAccessErrorContext,
  ): UserOrganizationMembership {
    const membership = user.memberships.find(
      ({ organizationId: membershipOrganizationId }) =>
        membershipOrganizationId === organizationId,
    );

    if (!membership) {
      throw new UserNotInOrganizationError(this.toOrganizationContext(context));
    }

    return membership;
  }

  private toOrganizationContext(
    context: UserAccessErrorContext,
  ): OrganizationContext {
    if (!context.organizationId) {
      throw new Error(
        'Organization ID is required for member access operations',
      );
    }

    return {
      userId: context.userId,
      organizationId: context.organizationId,
    };
  }
}
