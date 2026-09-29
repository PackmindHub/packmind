import { ForbiddenException, Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ISpacesPort,
  OrganizationId,
  UserId,
  createSpaceId,
} from '@packmind/types';
import { validate as isUuid } from 'uuid';
import { InjectSpacesAdapter } from '../shared/HexaInjection';
import { resolveSSESubscriptionScope } from './sseSubscriptionScopes';

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
 * Both space-scoped events are deliberately thin — they carry the two ids
 * needed to route them and nothing else — so what this closes is a timing side
 * channel rather than a content leak: without it, knowing a space id was enough
 * to learn when that space changed, whatever organization owned it.
 *
 * The space rule is the one the frontend already applies to reach the pages
 * these events refresh, so enforcing it here costs no legitimate subscriber
 * anything. It is stricter than the read endpoints the subscriber refetches
 * through, which gate on the organization alone.
 */
@Injectable()
export class SSESubscriptionAuthorizer {
  constructor(
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
    private readonly logger: PackmindLogger,
  ) {}

  /** Resolves if the subscription may be registered, throws otherwise. */
  async assertMaySubscribe({
    userId,
    organizationId,
    eventType,
    params,
  }: MaySubscribeQuery): Promise<void> {
    const scope = resolveSSESubscriptionScope(eventType);

    if (!scope) {
      this.refuse('unknown event type', { userId, eventType, params });
    }

    if (scope === 'targeted') {
      return;
    }

    const [subject] = params;

    if (!subject || !isUuid(subject)) {
      this.refuse('malformed subscription subject', {
        userId,
        eventType,
        params,
      });
    }

    if (scope === 'organization') {
      if (subject !== organizationId) {
        this.refuse('organization does not match the caller', {
          userId,
          eventType,
          params,
        });
      }
      return;
    }

    const membership = await this.spacesAdapter.findMembership(
      userId,
      createSpaceId(subject),
    );

    if (!membership) {
      this.refuse('caller is not a member of the space', {
        userId,
        eventType,
        params,
      });
    }
  }

  /**
   * One message for every refusal: which of the reasons below applies would
   * itself tell the caller whether the id they guessed names anything.
   */
  private refuse(
    reason: string,
    context: { userId: UserId; eventType: string; params: string[] },
  ): never {
    this.logger.warn('Refused an SSE subscription', { reason, ...context });

    throw new ForbiddenException(
      `Access denied: you cannot subscribe to ${context.eventType} events`,
    );
  }
}
