import { PackmindInternalError } from '@packmind/types';

export type SpacesInternalErrorReason = 'default_space_missing';

export type SpacesInternalErrorContext = {
  organizationId?: string;
};

/**
 * Base for the spaces broken invariants, in the same shape as
 * `SpacesError` but on the internal side: no `kind` to choose — it is
 * always 500, logged with its stack and with its message withheld from the
 * client — a literal `reason` union naming the invariant and a typed `context`
 * carrying the ids.
 *
 * The line between this and `SpacesError` is fault, not severity: if the
 * caller could have avoided it by asking for something else, it is a
 * `SpacesError`. If the wiring is broken or stored state has lost an
 * invariant, it is this.
 */
export class SpacesInternalError extends PackmindInternalError {
  constructor(
    reason: SpacesInternalErrorReason,
    context: SpacesInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'SpacesInternalError';
  }
}
