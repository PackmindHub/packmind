import { FileUpdates } from '@packmind/types';
import { CreateSkillDeployer } from './CreateSkillDeployer';
import { StandardCreatorDeployer } from './StandardCreatorDeployer';

export class DefaultSkillsDeployer {
  constructor(
    public readonly agentName: string,
    public readonly skillsFolderPath: string,
  ) {}

  public deployDefaultSkills(): FileUpdates {
    const skillCreatorFiles = this.deploySkillsCreator();
    const standardCreatorFiles = this.deployStandardCreator();

    return {
      createOrUpdate: [
        ...skillCreatorFiles.createOrUpdate,
        ...standardCreatorFiles.createOrUpdate,
      ],
      delete: [...skillCreatorFiles.delete, ...standardCreatorFiles.delete],
    };
  }

  private deploySkillsCreator(): FileUpdates {
    return new CreateSkillDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }

  private deployStandardCreator(): FileUpdates {
    return new StandardCreatorDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }
}
