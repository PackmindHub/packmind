import { DomainError, DomainErrorKind } from '@packmind/types';

export type CommandsErrorReason =
  | 'command_not_found'
  | 'command_slug_already_exists'
  | 'space_not_accessible';

export type CommandsErrorContext = {
  commandId?: string;
  commandSlug?: string;
  spaceId?: string;
  organizationId?: string;
};

/**
 * Base for the commands domain errors, in the same shape as `StandardsError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class CommandsError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: CommandsErrorReason;
  readonly context: CommandsErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: CommandsErrorReason,
    context: CommandsErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'CommandsError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
