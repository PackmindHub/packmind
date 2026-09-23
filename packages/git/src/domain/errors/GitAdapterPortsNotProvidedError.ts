import { GitInternalError } from './GitInternalError';

/**
 * `initialize()` ran without every port and service the adapter needs. It is
 * a wiring mistake in the module that builds the adapter, not something a
 * request carries, so no caller can provoke or correct it.
 */
export class GitAdapterPortsNotProvidedError extends GitInternalError {
  constructor() {
    super(
      'git_adapter_ports_not_provided',
      {},
      'GitAdapter: Required ports/services not provided. Ensure JobsService and PackmindEventEmitterService are passed to initialize().',
    );
    this.name = 'GitAdapterPortsNotProvidedError';
  }
}
