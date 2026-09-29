import { PackmindLogger } from '@packmind/logger';
import {
  ISpacesPort,
  OrganizationId,
  UserId,
  createSpaceId,
} from '@packmind/types';
import { validate as isUuid } from 'uuid';
import {
  EventTypeNotSubscribableError,
  SubscriptionSubjectNotAccessibleError,
} from './SSESubscriptionErrors';
import { resolveSSESubscriptionScope } from './sseSubscriptionScopes';

const origin = 'SSESubscriptionAuthorizer';

export type MaySubscribeQuery = {
  userId: UserId;
  /** Absent only if the request carried no organization context. */
  organizationId?: OrganizationId;
  eventType: string;
  params: string[];
};

/**
 * Decides whether a caller may subscribe to what they named.
 *
 * The space-scoped events are deliberately thin — they carry the two ids needed
 * to route them and nothing else — so what this closes is a timing side channel
 * rather than a content leak: without it, knowing a space id was enough to
 * learn when that space changed, whatever organization owned it.
 *
 * The space rule is the one the frontend already applies to reach the pages
 * these events refresh, so enforcing it here costs no legitimate subscriber
 * anything. It is stricter than the read endpoints the subscriber refetches
 * through, which gate on the organization alone.
 *
 * Deliberately free of any web framework: it throws domain errors and lets
 * DomainExceptionFilter turn them into answers.
 */
export class SSESubscriptionAuthorizer {
  constructor(
    private readonly spacesPort: ISpacesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /** Resolves if the subscription may be registered, throws otherwise. */
  async assertMaySubscribe({
    userId,
    organizationId,
    eventType,
    params,
  }: MaySubscribeQuery): Promise<void> {
    const context = { userId, eventType, params };
    const scope = resolveSSESubscriptionScope(eventType);

    if (!scope) {
      this.refuse(
        new EventTypeNotSubscribableError(context),
        'unknown event type',
      );
    }

    if (scope === 'targeted') {
      return;
    }

    const [subject] = params;

    if (!subject || !isUuid(subject)) {
      this.refuse(
        new EventTypeNotSubscribableError(context),
        'malformed subscription subject',
      );
    }

    if (scope === 'organization') {
      if (subject !== organizationId) {
        this.refuse(
          new SubscriptionSubjectNotAccessibleError(context),
          'organization does not match the caller',
        );
      }
      return;
    }

    const membership = await this.spacesPort.findMembership(
      userId,
      createSpaceId(subject),
    );

    if (!membership) {
      this.refuse(
        new SubscriptionSubjectNotAccessibleError(context),
        'caller is not a member of the space',
      );
    }
  }

  /**
   * The reason is logged rather than carried in the error: which rule tripped
   * would itself tell the caller whether the id they guessed names anything.
   */
  private refuse(error: Error, reason: string): never {
    this.logger.warn('Refused an SSE subscription', { reason });

    throw error;
  }
}
