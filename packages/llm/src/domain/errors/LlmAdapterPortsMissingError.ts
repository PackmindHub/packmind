import { LlmInternalError } from '@packmind/types';

/**
 * The adapter was initialized without the ports its use cases need. A wiring
 * invariant: `missingPorts` names which ones were absent; no request could
 * avoid it.
 */
export class LlmAdapterPortsMissingError extends LlmInternalError {
  constructor(missingPorts: string[]) {
    super(
      'llm_adapter_ports_missing',
      { missingPorts },
      `LlmAdapter: Required ports not provided: ${missingPorts.join(', ')}.`,
    );
    this.name = 'LlmAdapterPortsMissingError';
  }
}
