import { CodingAgent } from '../../domain/CodingAgents';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';
import { PackmindDeployer } from './packmind/PackmindDeployer';
import { JunieDeployer } from './junie/JunieDeployer';
import { ClaudeDeployer } from './claude/ClaudeDeployer';
import { CursorDeployer } from './cursor/CursorDeployer';
import { CopilotDeployer } from './copilot/CopilotDeployer';
import { AgentsMDDeployer } from './agentsmd/AgentsMDDeployer';
import { StandardsHexa } from '@packmind/standards';
import { GitHexa } from '@packmind/git';

export class CodingAgentDeployerRegistry
  implements ICodingAgentDeployerRegistry
{
  private readonly deployers = new Map<CodingAgent, ICodingAgentDeployer>();

  constructor(
    private readonly standardsHexa?: StandardsHexa,
    private readonly gitHexa?: GitHexa,
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
        return new PackmindDeployer(this.standardsHexa);
      case 'junie':
        return new JunieDeployer(this.standardsHexa, this.gitHexa);
      case 'claude':
        return new ClaudeDeployer(this.standardsHexa, this.gitHexa);
      case 'cursor':
        return new CursorDeployer(this.standardsHexa, this.gitHexa);
      case 'copilot':
        return new CopilotDeployer(this.standardsHexa, this.gitHexa);
      case 'agents_md':
        return new AgentsMDDeployer(this.standardsHexa, this.gitHexa);
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
      agent === 'agents_md'
    );
  }
}
