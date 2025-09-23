import {
  SingleFileDeployer,
  DeployerConfig,
} from '../genericSectionWriter/SingleFileDeployer';

export class ClaudeDeployer extends SingleFileDeployer {
  protected readonly config: DeployerConfig = {
    filePath: 'CLAUDE.md',
    agentName: 'Claude Code',
  };
}
