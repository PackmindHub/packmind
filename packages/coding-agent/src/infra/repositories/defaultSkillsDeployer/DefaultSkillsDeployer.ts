import { FileUpdates } from '@packmind/types';
import { CreateCommandDeployer } from './CreateCommandDeployer';
import { CreateSkillDeployer } from './CreateSkillDeployer';
import { CreateStandardDeployer } from './CreateStandardDeployer';

export class DefaultSkillsDeployer {
  constructor(
    public readonly agentName: string,
    public readonly skillsFolderPath: string,
  ) {}

  public deployDefaultSkills(): FileUpdates {
    const skillCreatorFiles = this.deploySkillsCreator();
    const standardCreatorFiles = this.deployStandardCreator();
    const commandCreatorFiles = this.deployCommandCreator();

    return {
      createOrUpdate: [
        ...skillCreatorFiles.createOrUpdate,
        ...standardCreatorFiles.createOrUpdate,
        ...commandCreatorFiles.createOrUpdate,
      ],
      delete: [
        ...skillCreatorFiles.delete,
        ...standardCreatorFiles.delete,
        ...commandCreatorFiles.delete,
      ],
    };
  }

  private deploySkillsCreator(): FileUpdates {
    return new CreateSkillDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }

  private deployStandardCreator(): FileUpdates {
    return new CreateStandardDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }

  private deployCommandCreator(): FileUpdates {
    return new CreateCommandDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }
}
