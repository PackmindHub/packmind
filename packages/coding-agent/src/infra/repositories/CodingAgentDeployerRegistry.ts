import { CodingAgent } from '../../domain/CodingAgents';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';
import { PackmindDeployer } from './packmind/PackmindDeployer';
import { JunieDeployer } from './junie/JunieDeployer';
import { ClaudeDeployer } from './claude/ClaudeDeployer';
import { CursorDeployer } from './cursor/CursorDeployer';
import { CopilotDeployer } from './copilot/CopilotDeployer';
import { AgentsMDDeployer } from './agentsmd/AgentsMDDeployer';
import { IStandardsPort, IGitPort } from '@packmind/types';
import { GitlabDuoDeployer } from './gitlabDuo/GitlabDuoDeployer';
import { ContinueDeployer } from './continue/ContinueDeployer';

export class CodingAgentDeployerRegistry
  implements ICodingAgentDeployerRegistry
{
  private readonly deployers = new Map<CodingAgent, ICodingAgentDeployer>();

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
  ) {}

  getDeployer(agent: CodingAgent): ICodingAgentDeployer {
    if (!this.deployers.has(agent)) {
      this.deployers.set(agent, this.createDeployer(agent));
    }
    const deployer = this.deployers.get(agent);
    if (!deployer) {
      throw new Error(`Failed to create deployer for agent: ${agent}`);
    }
    return deployer;
  }

  registerDeployer(agent: CodingAgent, deployer: ICodingAgentDeployer): void {
    this.deployers.set(agent, deployer);
  }

  hasDeployer(agent: CodingAgent): boolean {
    return this.deployers.has(agent) || this.canCreateDeployer(agent);
  }

  private createDeployer(agent: CodingAgent): ICodingAgentDeployer {
    switch (agent) {
      case 'packmind':
        return new PackmindDeployer(this.standardsPort);
      case 'junie':
        return new JunieDeployer(this.standardsPort, this.gitPort);
      case 'claude':
        return new ClaudeDeployer(this.standardsPort, this.gitPort);
      case 'cursor':
        return new CursorDeployer(this.standardsPort, this.gitPort);
      case 'copilot':
        return new CopilotDeployer(this.standardsPort, this.gitPort);
      case 'agents_md':
        return new AgentsMDDeployer(this.standardsPort, this.gitPort);
      case 'gitlab_duo':
        return new GitlabDuoDeployer(this.standardsPort, this.gitPort);
      case 'continue':
        return new ContinueDeployer(this.standardsPort, this.gitPort);
      default:
        throw new Error(`Unknown coding agent: ${agent}`);
    }
  }

  private canCreateDeployer(agent: CodingAgent): boolean {
    return (
      agent === 'packmind' ||
      agent === 'junie' ||
      agent === 'claude' ||
      agent === 'cursor' ||
      agent === 'copilot' ||
      agent === 'agents_md' ||
      agent === 'gitlab_duo' ||
      agent === 'continue'
    );
  }
}
