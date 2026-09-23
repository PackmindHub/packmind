import { PackmindInternalError } from '@packmind/types';

export type StandardsInternalErrorReason = 'standard_version_missing';

export type StandardsInternalErrorContext = {
  standardId?: string;
};

/**
 * Base for the standards broken invariants, in the same shape as
 * `StandardsError` but on the internal side: no `kind` to choose — it is
 * always 500, logged with its stack and with its message withheld from the
 * client — a literal `reason` union naming the invariant and a typed `context`
 * carrying the ids.
 *
 * The line between this and `StandardsError` is fault, not severity: if the
 * caller could have avoided it by asking for something else, it is a
 * `StandardsError`. If the wiring is broken or an already-created standard has
 * lost its version, it is this.
 */
export class StandardsInternalError extends PackmindInternalError {
  constructor(
    reason: StandardsInternalErrorReason,
    context: StandardsInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'StandardsInternalError';
  }
}
