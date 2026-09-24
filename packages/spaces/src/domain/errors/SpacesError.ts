import { DomainError, DomainErrorKind } from '@packmind/types';

export type SpacesErrorReason =
  | 'space_not_found'
  | 'space_slug_conflict'
  | 'space_member_not_found'
  | 'cannot_remove_self'
  | 'cannot_remove_from_default_space'
  | 'cannot_update_own_role'
  | 'invalid_space_name';

export type SpacesErrorContext = {
  spaceIdOrSlug?: string;
  spaceId?: string;
  spaceName?: string;
  organizationId?: string;
  userId?: string;
};

/**
 * Base for the spaces domain errors, in the same shape as `CommandsError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class SpacesError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: SpacesErrorReason;
  readonly context: SpacesErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: SpacesErrorReason,
    context: SpacesErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'SpacesError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
