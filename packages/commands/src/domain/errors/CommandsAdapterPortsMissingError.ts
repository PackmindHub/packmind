import { CommandsInternalError } from './CommandsInternalError';

/**
 * The adapter was initialized without the ports or delayed jobs its use
 * cases need.
 *
 * A wiring invariant: `missingPorts` names which ones were absent; no
 * request could avoid it.
 */
export class CommandsAdapterPortsMissingError extends CommandsInternalError {
  constructor(missingPorts: string[]) {
    super(
      'commands_adapter_ports_missing',
      { missingPorts },
      `CommandsAdapter: Required ports/delayed jobs not provided: ${missingPorts.join(', ')}.`,
    );
    this.name = 'CommandsAdapterPortsMissingError';
  }
}
