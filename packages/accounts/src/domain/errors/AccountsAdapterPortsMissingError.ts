import { AccountsInternalError } from './AccountsInternalError';

/**
 * The adapter was used without the ports its use cases need.
 *
 * A wiring invariant: `capability` names what was asked for and, when known,
 * `missingPorts` names which ports were absent; no request could avoid it.
 */
export class AccountsAdapterPortsMissingError extends AccountsInternalError {
  constructor(capability: string, missingPorts?: string[]) {
    super(
      'accounts_adapter_ports_missing',
      { capability, missingPorts },
      `AccountsAdapter: ${capability} not available - missing dependencies`,
    );
    this.name = 'AccountsAdapterPortsMissingError';
  }
}
