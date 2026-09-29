import {
  AnySSEEvent,
  DataChangeEvent,
  HelloWorldEvent,
  NotificationEvent,
} from '@packmind/types';

/**
 * What subscribing to an event type has to prove before the subscription is
 * registered.
 *
 * - `space`: `params[0]` names a space, and the caller must be a member of it.
 * - `organization`: `params[0]` names an organization, and it must be the one
 *   the caller is authenticated against.
 * - `targeted`: the publisher names its recipients, so nothing reaches a
 *   subscriber who was not named and the params carry nothing worth checking.
 */
export type SSESubscriptionScope = 'space' | 'organization' | 'targeted';

/**
 * Written straight to a connection as it opens, never routed by subscription
 * key, so there is nothing to subscribe to.
 */
type UnroutedSSEEventType = HelloWorldEvent['type'];

/**
 * Declared, and re-exported to the frontend, but nothing publishes them in
 * either edition. A scope cannot honestly be assigned to an event type whose
 * publisher does not exist — `targeted` in particular would be a claim about a
 * publisher nobody has written yet, and would quietly become a hole the day
 * somebody writes a broadcasting one.
 *
 * Whoever gives one of these a publisher moves it into the record below and
 * decides there what seeing it requires. Until then subscribing to it is
 * refused, which costs nothing: no such event is ever sent.
 */
type UnpublishedSSEEventType =
  | NotificationEvent['type']
  | DataChangeEvent['type'];

/** Every event type a client may name when it subscribes. */
type SubscribableSSEEventType = Exclude<
  AnySSEEvent['type'],
  UnroutedSSEEventType | UnpublishedSSEEventType
>;

/**
 * What each subscribable event type is checked against.
 *
 * Derived from `AnySSEEvent` rather than listed by hand: the record is total
 * over that union, so adding an event type there without deciding what seeing
 * it requires fails to compile. An event type absent at runtime — one a caller
 * invented — is refused, which was the whole gap: subscribing used to allow
 * anything a caller cared to name.
 */
const SUBSCRIPTION_SCOPES: Record<
  SubscribableSSEEventType,
  SSESubscriptionScope
> = {
  SPACE_CONTENT_CHANGED: 'space',
  CHANGE_PROPOSAL_UPDATE: 'space',
  DISTRIBUTION_STATUS_CHANGE: 'organization',
  USER_CONTEXT_CHANGE: 'targeted',
  MARKETPLACE_PUBLISH_COMPLETED: 'targeted',
  PROGRAM_STATUS_CHANGE: 'targeted',
  ASSESSMENT_STATUS_CHANGE: 'targeted',
  DETECTION_HEURISTICS_UPDATED: 'targeted',
};

/**
 * Looked up upper-cased because SSEService folds subscription keys to upper
 * case, and publishers are not consistent about the case they publish under:
 * `program_status_change` on the wire is `PROGRAM_STATUS_CHANGE` above.
 */
const SCOPE_BY_UPPER_CASED_EVENT_TYPE = new Map(
  Object.entries(SUBSCRIPTION_SCOPES).map(([eventType, scope]) => [
    eventType.toUpperCase(),
    scope,
  ]),
);

/** Undefined for an event type nobody may subscribe to. */
export function resolveSSESubscriptionScope(
  eventType: string,
): SSESubscriptionScope | undefined {
  return SCOPE_BY_UPPER_CASED_EVENT_TYPE.get(eventType.toUpperCase());
}
