import { PackmindInternalError } from '@packmind/types';

export type CommandsInternalErrorReason = 'hexa_dependency_missing';

export type CommandsInternalErrorContext = {
  commandId?: string;
  dependency?: string;
};

/**
 * Base for the commands broken invariants, in the same shape as
 * `CommandsError` but on the internal side: no `kind` to choose — it is
 * always 500, logged with its stack and with its message withheld from the
 * client — a literal `reason` union naming the invariant and a typed `context`
 * carrying the ids.
 *
 * The line between this and `CommandsError` is fault, not severity: if the
 * caller could have avoided it by asking for something else, it is a
 * `CommandsError`. If the wiring is broken or stored state has lost an
 * invariant, it is this.
 */
export class CommandsInternalError extends PackmindInternalError {
  constructor(
    reason: CommandsInternalErrorReason,
    context: CommandsInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'CommandsInternalError';
  }
}
