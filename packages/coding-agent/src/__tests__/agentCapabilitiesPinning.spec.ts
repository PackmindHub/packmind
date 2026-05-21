import {
  AGENT_CAPABILITIES,
  CodingAgent,
  VALID_CODING_AGENTS,
} from '@packmind/types';
import { CodingAgentDeployerRegistry } from '../infra/repositories/CodingAgentDeployerRegistry';

describe('Agent capability pinning', () => {
  let registry: CodingAgentDeployerRegistry;

  beforeAll(() => {
    registry = new CodingAgentDeployerRegistry();
  });

  describe('skills capability', () => {
    it.each<CodingAgent>([...VALID_CODING_AGENTS])(
      'matches deployer.getSkillsFolderPath() for %s',
      (agent) => {
        const deployer = registry.getDeployer(agent);
        const deployerSupportsSkills =
          deployer.getSkillsFolderPath() !== undefined;
        expect(AGENT_CAPABILITIES[agent].skills).toBe(deployerSupportsSkills);
      },
    );
  });
});
