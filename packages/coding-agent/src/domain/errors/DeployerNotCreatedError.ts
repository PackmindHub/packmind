import { CodingAgentInternalError } from './CodingAgentInternalError';

/**
 * The deployer was supposed to be created but the registry returned null.
 *
 * This is our wiring mistake, not something a caller can provoke or correct.
 */
export class DeployerNotCreatedError extends CodingAgentInternalError {
  constructor(agent: string) {
    super(
      'deployer_not_created',
      { codingAgent: agent },
      `Failed to create deployer for agent: ${agent}`,
    );
    this.name = 'DeployerNotCreatedError';
  }
}
