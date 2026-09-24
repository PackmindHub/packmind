import { CodingAgentError } from './CodingAgentError';

/**
 * The specified coding agent does not exist or is not supported.
 *
 * The agent value comes from customer data (a packmind.json committed in the
 * customer's repo, a URL param), so this is the caller's fault, not ours.
 */
export class UnknownCodingAgentError extends CodingAgentError {
  constructor(agent: string) {
    super(
      'invalid_input',
      'unknown_coding_agent',
      { codingAgent: agent },
      `Unknown coding agent: "${agent}".`,
    );
    this.name = 'UnknownCodingAgentError';
  }
}
