import { SkillsInternalError } from './SkillsInternalError';

/**
 * A use case reached for a port its adapter was not wired with.
 *
 * A wiring invariant: `port` names which one was missing; no request could
 * avoid it.
 */
export class SkillsPortNotAvailableError extends SkillsInternalError {
  constructor(port: string) {
    super('port_not_available', { port }, `${port} not available`);
    this.name = 'SkillsPortNotAvailableError';
  }
}
