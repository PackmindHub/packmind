import { PackmindInternalError } from '@packmind/types';

export type CodingAgentInternalErrorReason =
  | 'deployer_not_created'
  | 'adapter_ports_missing';

export type CodingAgentInternalErrorContext = {
  codingAgent?: string;
  missingPorts?: string[];
};

/**
 * Base for the coding agent broken invariants, in the same shape as
 * `CodingAgentError` but on the internal side: no `kind` to choose — it is
 * always 500, logged with its stack and with its message withheld from the
 * client — a literal `reason` union naming the invariant and a typed `context`
 * carrying the ids.
 *
 * The line between this and `CodingAgentError` is fault, not severity: if the
 * caller could have avoided it by asking for something else, it is a
 * `CodingAgentError`. If the wiring is broken or stored state has lost an
 * invariant, it is this.
 */
export class CodingAgentInternalError extends PackmindInternalError {
  constructor(
    reason: CodingAgentInternalErrorReason,
    context: CodingAgentInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'CodingAgentInternalError';
  }
}
