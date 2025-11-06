import {
  SingleFileDeployer,
  DeployerConfig,
} from '../genericSectionWriter/SingleFileDeployer';

export class GitlabDuoDeployer extends SingleFileDeployer {
  protected readonly config: DeployerConfig = {
    filePath: '.gitlab/duo/chat-rules.md',
    agentName: 'Gitlab Duo',
    pathToPackmindFolder: '../../',
  };
}
