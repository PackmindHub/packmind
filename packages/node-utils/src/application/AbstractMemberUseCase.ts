import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  IUseCase,
  Organization,
  OrganizationId,
  PackmindCommand,
  PackmindResult,
  User,
  UserId,
  UserOrganizationMembership,
} from '@packmind/types';
import {
  OrganizationContext,
  UserAccessError,
  UserAccessErrorContext,
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';
import { withSpan } from '../observability/withSpan';

const defaultOrigin = 'AbstractMemberUseCase';

export type MemberContext = {
  user: User;
  organization: Organization;
  membership: UserOrganizationMembership;
};

export abstract class AbstractMemberUseCase<
  Command extends PackmindCommand,
  Result extends PackmindResult,
> implements IUseCase<Command, Result> {
  constructor(
    protected readonly accountsPort: IAccountsPort,
    protected readonly logger: PackmindLogger = new PackmindLogger(
      defaultOrigin,
    ),
  ) {}

  // Every authenticated use case in the monorepo funnels through here, so one
  // span at this single point gives the whole domain layer a place in the
  // trace - the level between the Nest handler span and the pg spans that was
  // previously blank. AbstractAdminUseCase, AbstractSpaceMemberUseCase and
  // AbstractSpaceAdminUseCase all extend this class and inherit this method.
  //
  // Deliberately no span attributes: userId and organizationId would ship
  // identifiers to the trace backend, which is the same reason pg stays on
  // enhancedDatabaseReporting: false. The class name is the whole point.
  async execute(command: Command): Promise<Result> {
    // this.constructor.name rather than a literal, so each subclass names its
    // own span. It survives production bundling because terser runs with
    // keep_classnames: true (apps/api/webpack.config.js), already required for
    // NestJS DI.
    return withSpan(this.constructor.name, async () => {
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
    });
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
      await this.accountsPort.getOrganizationById(organizationId);

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    return organization;
  }

  private async fetchUser(
    userId: UserId,
    context: UserAccessErrorContext,
  ): Promise<User> {
    const user = await this.accountsPort.getUserById(userId);

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
