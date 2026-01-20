import { FileUpdates } from '@packmind/types';
import { SkillCreatorDeployer } from './SkillCreatorDeployer';

export class DefaultSkillsDeployer {
  constructor(
    public readonly agentName: string,
    public readonly skillsFolderPath: string,
  ) {}

  public deployDefaultSkills(): FileUpdates {
    return this.deploySkillsCreator();
  }

  public deploySkillsCreator(): FileUpdates {
    return new SkillCreatorDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }
}
