import {
  SingleFileDeployer,
  DeployerConfig,
} from '../genericSectionWriter/SingleFileDeployer';

export class JunieDeployer extends SingleFileDeployer {
  protected readonly config: DeployerConfig = {
    filePath: '.junie/guidelines.md',
    agentName: 'Junie',
    pathToPackmindFolder: '../',
  };
}
