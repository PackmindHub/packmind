import { FileUpdates } from '@packmind/types';
import { CliListCommandsDeployer } from './CliListCommandsDeployer';
import { CreateCommandDeployer } from './CreateCommandDeployer';
import { CreatePackageDeployer } from './CreatePackageDeployer';
import { CreateSkillDeployer } from './CreateSkillDeployer';
import { CreateStandardDeployer } from './CreateStandardDeployer';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { OnboardDeployer } from './OnboardDeployer';
import { UpdatePlaybookDeployer } from './UpdatePlaybookDeployer';
import { UpdatePlaybookDeployerV2 } from './UpdatePlaybookDeployerV2';

export type DeployDefaultSkillsOptions = {
  cliVersion?: string;
  includeBeta?: boolean;
};

export type DefaultSkillsDeployResult = {
  fileUpdates: FileUpdates;
  skippedSkillsCount: number;
};

export class DefaultSkillsDeployer {
  private readonly skillDeployers: ISkillDeployer[] = [
    new CreateSkillDeployer(),
    new CreateStandardDeployer(),
    new OnboardDeployer(),
    new CreateCommandDeployer(),
    new CreatePackageDeployer(),
    new CliListCommandsDeployer(),
    new UpdatePlaybookDeployer(),
    new UpdatePlaybookDeployerV2(),
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
      'packmind-update-playbook',
      'packmind-update-playbook-v2',
    ];
  }

  public deployDefaultSkills(
    options: DeployDefaultSkillsOptions = {},
  ): DefaultSkillsDeployResult {
    const filteredDeployers = this.filterDeployers(options);
    const skippedSkillsCount = this.countSkippedDeployers(options);

    const allFileUpdates = filteredDeployers.map((deployer) =>
      deployer.deploy(this.agentName, this.skillsFolderPath),
    );

    return {
      fileUpdates: {
        createOrUpdate: allFileUpdates.flatMap(
          (updates) => updates.createOrUpdate,
        ),
        delete: allFileUpdates.flatMap((updates) => updates.delete),
      },
      skippedSkillsCount,
    };
  }

  private filterDeployers(
    options: DeployDefaultSkillsOptions,
  ): ISkillDeployer[] {
    const { cliVersion, includeBeta } = options;

    if (includeBeta) {
      return this.skillDeployers;
    }

    return this.skillDeployers.filter((deployer) =>
      deployer.isSupportedByCliVersion(cliVersion),
    );
  }

  private countSkippedDeployers(options: DeployDefaultSkillsOptions): number {
    const { cliVersion, includeBeta } = options;

    if (includeBeta || !cliVersion) {
      return 0;
    }

    return this.skillDeployers.filter(
      (deployer) =>
        !deployer.isSupportedByCliVersion(cliVersion) &&
        !deployer.isBetaSkill(),
    ).length;
  }
}
