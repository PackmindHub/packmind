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
 * Every event type a client may subscribe to, and what each one is checked
 * against.
 *
 * Exhaustive by design rather than defaulted: an event type absent from here is
 * refused, so a newly published one stays unreachable until somebody has
 * decided what seeing it should require. That is the whole point — the previous
 * behaviour was to allow anything a caller cared to name.
 *
 * Keys are upper case because SSEService folds subscription keys to upper case,
 * and publishers are not consistent about the case they publish under:
 * `program_status_change` on the wire is `PROGRAM_STATUS_CHANGE` here.
 */
const SUBSCRIPTION_SCOPES = new Map<string, SSESubscriptionScope>([
  ['SPACE_CONTENT_CHANGED', 'space'],
  ['CHANGE_PROPOSAL_UPDATE', 'space'],
  ['DISTRIBUTION_STATUS_CHANGE', 'organization'],
  ['USER_CONTEXT_CHANGE', 'targeted'],
  ['MARKETPLACE_PUBLISH_COMPLETED', 'targeted'],
  ['PROGRAM_STATUS_CHANGE', 'targeted'],
  ['ASSESSMENT_STATUS_CHANGE', 'targeted'],
  ['DETECTION_HEURISTICS_UPDATED', 'targeted'],
]);

/** Undefined for an event type nobody may subscribe to. */
export function resolveSSESubscriptionScope(
  eventType: string,
): SSESubscriptionScope | undefined {
  return SUBSCRIPTION_SCOPES.get(eventType.toUpperCase());
}
