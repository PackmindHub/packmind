import { StandardsInternalError } from './StandardsInternalError';

/**
 * The adapter was initialized without the ports/services its use cases
 * need.
 *
 * A wiring invariant: `missingPorts` names which ones were absent; no
 * request could avoid it.
 */
export class StandardsAdapterPortsMissingError extends StandardsInternalError {
  constructor(missingPorts: string[]) {
    super(
      'standards_adapter_ports_missing',
      { missingPorts },
      `StandardsAdapter: Required ports/services not provided: ${missingPorts.join(', ')}.`,
    );
    this.name = 'StandardsAdapterPortsMissingError';
  }
}
