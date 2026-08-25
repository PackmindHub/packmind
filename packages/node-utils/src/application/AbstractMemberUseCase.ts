import { Attributes } from '@opentelemetry/api';
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
import { instrumentMethods } from '../observability/instrumentMethods';
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
  ) {
    // Gives every async method on this use case - inherited, overridden or
    // private - its own span, so the layer between the use-case span below and
    // the repository spans stops being a blank. One call here covers every
    // authenticated use case in the monorepo; nothing opts in per method.
    //
    // `execute` is skipped because it already owns the explicit span below,
    // which this cannot replace: that call site is the only one holding the
    // validated command, so it is the only place the tenant attributes can be
    // set from. Patching it too would nest a second, identical
    // `<Subclass>.execute` span above it.
    instrumentMethods(this, { skip: ['execute'] });
  }

  // Every authenticated use case in the monorepo funnels through here, so one
  // span at this single point gives the whole domain layer a place in the
  // trace - the level between the Nest handler span and the repository spans
  // that was previously blank. AbstractAdminUseCase, AbstractSpaceMemberUseCase
  // and AbstractSpaceAdminUseCase all extend this class and inherit this
  // method.
  //
  // The span carries the organization and nothing else. A tenant id is what
  // makes traces filterable per customer, and it is already a Loki label on
  // every log line the winston transport exports, so spans add no new
  // exposure. userId and the rest stay off, for the same reason the pg
  // instrumentation did not record bind values: a trace backend is not the
  // place for per-user data.
  async execute(command: Command): Promise<Result> {
    // this.constructor.name rather than a literal, so each subclass names its
    // own span. It survives production bundling because terser runs with
    // keep_classnames: true (apps/api/webpack.config.js), already required for
    // NestJS DI. The `.execute` suffix is added by hand here so this span has
    // the same `Class.method` shape instrumentMethods() gives every other one.
    return withSpan(`${this.constructor.name}.execute`, async (span) => {
      // Set before validation, not after, so a rejected request is still
      // attributable to the organization that made it.
      span.setAttributes(this.spanAttributes(command));

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

  /**
   * Attributes for this use case's span. Overridable so a subclass can add its
   * own without reaching for trace.getActiveSpan() from inside a nested call -
   * span concerns stay in execute().
   *
   * Tenant and space only. userId and emails stay off spans; see
   * docker/otel/README.md.
   *
   * spaceId is read off the command here rather than in the space-scoped
   * subclasses: AbstractSpaceMemberUseCase and AbstractSpaceAdminUseCase both
   * extend this class and neither extends the other, so an override there has
   * to exist twice, verbatim, and drift the moment one is edited. The cast is
   * what PackmindCommand cannot express - only its space-scoped extensions
   * declare spaceId - and it is spread conditionally, so a command without one
   * contributes no attribute rather than an empty string.
   */
  protected spanAttributes(command: Command): Attributes {
    const { spaceId } = command as Command & { spaceId?: string };

    return {
      'packmind.organization.id': command.organizationId,
      ...(spaceId && { 'packmind.space.id': spaceId }),
    };
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
