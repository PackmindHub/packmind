import {
  SingleFileDeployer,
  DeployerConfig,
} from '../genericSectionWriter/SingleFileDeployer';

export class AgentsMDDeployer extends SingleFileDeployer {
  protected readonly config: DeployerConfig = {
    filePath: 'AGENTS.md',
    agentName: 'AGENTS.md',
  };
}
