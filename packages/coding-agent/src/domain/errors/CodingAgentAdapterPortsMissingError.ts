import { CodingAgentInternalError } from './CodingAgentInternalError';

/**
 * `initialize()` ran without every port and service the adapter needs. It is
 * a wiring mistake in the module that builds the adapter, not something a
 * request carries, so no caller can provoke or correct it.
 */
export class CodingAgentAdapterPortsMissingError extends CodingAgentInternalError {
  constructor(missingPorts: string[] = []) {
    super(
      'adapter_ports_missing',
      { missingPorts },
      'CodingAgentAdapter: Required ports/services not provided. Ensure IStandardsPort and IGitPort are passed to initialize().',
    );
    this.name = 'CodingAgentAdapterPortsMissingError';
  }
}
