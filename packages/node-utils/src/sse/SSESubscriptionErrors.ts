import { DomainError, DomainErrorKind } from '@packmind/types';

export type SSESubscriptionErrorReason =
  | 'event_type_not_subscribable'
  | 'subscription_subject_not_accessible';

export type SSESubscriptionErrorContext = {
  userId: string;
  eventType: string;
  params: string[];
};

export class SSESubscriptionError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: SSESubscriptionErrorReason;
  readonly context: SSESubscriptionErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: SSESubscriptionErrorReason,
    context: SSESubscriptionErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'SSESubscriptionError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}

/**
 * The event type is not one anything publishes, or the params do not name a
 * subject in the shape the event type is scoped by.
 *
 * `invalid_input` rather than `not_found`: what is wrong is the request on its
 * face, independently of anything stored, so saying so reveals nothing about
 * what exists.
 */
export class EventTypeNotSubscribableError extends SSESubscriptionError {
  constructor(context: SSESubscriptionErrorContext) {
    super(
      'invalid_input',
      'event_type_not_subscribable',
      context,
      'This is not an event type you can subscribe to.',
    );
    this.name = 'EventTypeNotSubscribableError';
  }
}

/**
 * The subject named in the params does not exist, or the caller is not a member
 * of it, or it belongs to another organization.
 *
 * One error for all three, with one message, on purpose — the same reasoning as
 * `SpaceNotAccessibleError`, and the whole point of the issue this closes: a
 * caller outside an organization must not be able to tell a space that is not
 * theirs from one that was never there. Answering `forbidden` would confirm the
 * space exists, which is the timing side channel in a different disguise. What
 * was actually asked for is kept in the context, where only the log sees it.
 */
export class SubscriptionSubjectNotAccessibleError extends SSESubscriptionError {
  constructor(context: SSESubscriptionErrorContext) {
    super(
      'not_found',
      'subscription_subject_not_accessible',
      context,
      'This does not exist, or you do not have access to it.',
    );
    this.name = 'SubscriptionSubjectNotAccessibleError';
  }
}
