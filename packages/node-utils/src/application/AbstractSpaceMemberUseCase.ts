import { PackmindLogger } from '@packmind/logger';
import {
  DomainError,
  IAccountsPort,
  ISpacesPort,
  PackmindResult,
  SpaceMemberCommand,
} from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';

const defaultOrigin = 'AbstractSpaceMemberUseCase';

export type SpaceMemberContext = MemberContext;

/**
 * `not_found`, so that a non-member is not told the space exists.
 *
 * This follows the policy the frontend already states out loud, in the
 * space-protected route loader: "avoid leaking whether a space exists. This
 * prevents space enumeration attacks: 'not found' and 'no access' produce the
 * same response." Dozens of space-scoped use cases throw this with no handling
 * in their controller, and a blanket 403 would have turned every one of them
 * into an existence oracle.
 *
 * Where a route has decided otherwise it still wins: a controller that catches
 * this and throws its own `HttpException` is passed through untouched by
 * `DomainExceptionFilter`. Leaving a space, and pinning one, answer 404 that
 * way; moving artifacts between two spaces the caller already holds answers
 * 403, because there is no existence left to protect. Do not delete those
 * catches as redundant — check the status each one chose first.
 */
export class SpaceMembershipRequiredError extends DomainError {
  readonly kind = 'not_found' as const;
  readonly reason = 'space_membership_required' as const;

  /**
   * The ids the check ran on. Kept off the message and out of `details` — the
   * filter serializes `details` to the client — so they stay available for
   * logging without reaching the caller.
   */
  readonly context: { userId: string; spaceId: string };

  constructor(userId: string, spaceId: string) {
    // Deliberately says neither that the space exists nor that membership is
    // what failed: with `kind: 'not_found'`, a non-member and a bad id must be
    // indistinguishable.
    super(
      'Space not found. Check the space you requested, or ask an organization admin for access.',
    );
    this.name = 'SpaceMembershipRequiredError';
    this.context = { userId, spaceId };
  }
}

export abstract class AbstractSpaceMemberUseCase<
  Command extends SpaceMemberCommand,
  Result extends PackmindResult,
> extends AbstractMemberUseCase<Command, Result> {
  constructor(
    protected readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(defaultOrigin),
  ) {
    super(accountsPort, logger);
  }

  protected override async executeForMembers(
    command: Command & MemberContext,
  ): Promise<Result> {
    const callerMembership = await this.spacesPort.findMembership(
      command.user.id,
      command.spaceId,
    );

    if (!callerMembership) {
      throw new SpaceMembershipRequiredError(command.userId, command.spaceId);
    }

    return this.executeForSpaceMembers(command);
  }

  protected abstract executeForSpaceMembers(
    command: Command & SpaceMemberContext,
  ): Promise<Result>;
}
