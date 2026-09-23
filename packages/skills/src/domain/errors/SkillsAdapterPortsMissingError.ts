import { SkillsInternalError } from './SkillsInternalError';

/**
 * The adapter was initialized without the ports/services its use cases
 * need.
 *
 * A wiring invariant: `missingPorts` names which ones were absent; no
 * request could avoid it.
 */
export class SkillsAdapterPortsMissingError extends SkillsInternalError {
  constructor(missingPorts: string[]) {
    super(
      'skills_adapter_ports_missing',
      { missingPorts },
      'SkillsAdapter: Required ports/services not provided. Ensure eventEmitterService is passed to initialize().',
    );
    this.name = 'SkillsAdapterPortsMissingError';
  }
}
