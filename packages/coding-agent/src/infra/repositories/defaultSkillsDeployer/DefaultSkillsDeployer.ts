import { FileUpdates } from '@packmind/types';
import semver from 'semver';
import { CliListCommandsDeployer } from './CliListCommandsDeployer';
import { CreateCommandDeployer } from './CreateCommandDeployer';
import { CreatePackageDeployer } from './CreatePackageDeployer';
import { CreateSkillDeployer } from './CreateSkillDeployer';
import { CreateStandardDeployer } from './CreateStandardDeployer';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { OnboardDeployer } from './OnboardDeployer';

export type DeployDefaultSkillsOptions = {
  cliVersion?: string;
  includeBeta?: boolean;
};

export class DefaultSkillsDeployer {
  private readonly skillDeployers: ISkillDeployer[] = [
    new CreateSkillDeployer(),
    new CreateStandardDeployer(),
    new OnboardDeployer(),
    new CreateCommandDeployer(),
    new CreatePackageDeployer(),
    new CliListCommandsDeployer(),
  ];

  constructor(
    public readonly agentName: string,
    public readonly skillsFolderPath: string,
  ) {}

  public static getDefaultSkillSlugs(): string[] {
    return [
      'packmind-create-skill',
      'packmind-create-standard',
      'packmind-onboard',
      'packmind-create-command',
      'packmind-create-package',
      'packmind-cli-list-commands',
    ];
  }

  public deployDefaultSkills(
    options: DeployDefaultSkillsOptions = {},
  ): FileUpdates {
    const filteredDeployers = this.filterDeployers(options);

    const allFileUpdates = filteredDeployers.map((deployer) =>
      deployer.deploy(this.agentName, this.skillsFolderPath),
    );

    return {
      createOrUpdate: allFileUpdates.flatMap(
        (updates) => updates.createOrUpdate,
      ),
      delete: allFileUpdates.flatMap((updates) => updates.delete),
    };
  }

  private filterDeployers(
    options: DeployDefaultSkillsOptions,
  ): ISkillDeployer[] {
    const { cliVersion, includeBeta } = options;

    if (includeBeta) {
      return this.skillDeployers;
    }

    return this.skillDeployers.filter((deployer) => {
      if (deployer.minimumVersion === 'unreleased') {
        return false;
      }

      if (cliVersion) {
        return semver.lte(deployer.minimumVersion, cliVersion);
      }

      return true;
    });
  }
}
