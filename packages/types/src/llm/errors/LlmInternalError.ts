import { PackmindInternalError } from '../../errors';

export type LlmInternalErrorReason =
  | 'llm_adapter_ports_missing'
  | 'unknown_llm_provider'
  | 'packmind_provider_api_key_missing'
  | 'packmind_provider_unsupported';

export type LlmInternalErrorContext = {
  organizationId?: string;
  provider?: string;
  missingPorts?: string[];
  configKey?: string;
};

/**
 * Base for the llm broken invariants, in the same shape as
 * `CommandsInternalError`: no `kind` to choose — it is always 500, logged
 * with its stack and with its message withheld from the client — a literal
 * `reason` union naming the invariant and a typed `context` carrying the ids.
 */
export class LlmInternalError extends PackmindInternalError {
  constructor(
    reason: LlmInternalErrorReason,
    context: LlmInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'LlmInternalError';
  }
}
