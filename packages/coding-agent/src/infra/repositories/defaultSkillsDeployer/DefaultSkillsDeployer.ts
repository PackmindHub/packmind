import { FileUpdates } from '@packmind/types';
import { CliListCommandsDeployer } from './CliListCommandsDeployer';
import { CreateCommandDeployer } from './CreateCommandDeployer';
import { CreatePackageDeployer } from './CreatePackageDeployer';
import { CreateSkillDeployer } from './CreateSkillDeployer';
import { CreateStandardDeployer } from './CreateStandardDeployer';
import { OnboardDeployer } from './OnboardDeployer';

export class DefaultSkillsDeployer {
  constructor(
    public readonly agentName: string,
    public readonly skillsFolderPath: string,
  ) {}

  public deployDefaultSkills(): FileUpdates {
    const skillCreatorFiles = this.deploySkillsCreator();
    const standardCreatorFiles = this.deployStandardCreator();
    const onboardFiles = this.deployOnboard();
    const commandCreatorFiles = this.deployCommandCreator();
    const packageCreatorFiles = this.deployPackageCreator();
    const cliListCommandsFiles = this.deployCliListCommands();

    return {
      createOrUpdate: [
        ...skillCreatorFiles.createOrUpdate,
        ...standardCreatorFiles.createOrUpdate,
        ...onboardFiles.createOrUpdate,
        ...commandCreatorFiles.createOrUpdate,
        ...packageCreatorFiles.createOrUpdate,
        ...cliListCommandsFiles.createOrUpdate,
      ],
      delete: [
        ...skillCreatorFiles.delete,
        ...standardCreatorFiles.delete,
        ...onboardFiles.delete,
        ...commandCreatorFiles.delete,
        ...packageCreatorFiles.delete,
        ...cliListCommandsFiles.delete,
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

  private deployOnboard(): FileUpdates {
    return new OnboardDeployer().deploy(this.agentName, this.skillsFolderPath);
  }

  private deployCommandCreator(): FileUpdates {
    return new CreateCommandDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }

  private deployPackageCreator(): FileUpdates {
    return new CreatePackageDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }

  private deployCliListCommands(): FileUpdates {
    return new CliListCommandsDeployer().deploy(
      this.agentName,
      this.skillsFolderPath,
    );
  }
}
