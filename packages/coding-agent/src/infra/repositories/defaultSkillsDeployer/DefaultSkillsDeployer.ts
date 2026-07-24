import {
  DefaultSkillMetadata,
  DefaultSkillsDeployResult,
  DeployDefaultSkillsOptions,
} from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { OnboardDeployer } from './OnboardDeployer';
import { UpdatePlaybookDeployer } from './UpdatePlaybookDeployer';

export class DefaultSkillsDeployer {
  private readonly skillDeployers: ISkillDeployer[] = [
    new OnboardDeployer(),
    new UpdatePlaybookDeployer(),
  ];

  constructor(
    public readonly agentName: string,
    public readonly skillsFolderPath: string,
  ) {}

  /**
   * Slugs of every default skill that Packmind has ever shipped, used by the
   * agent deployers to purge managed default-skill directories from existing
   * installations. This list is intentionally broader than `skillDeployers`:
   * skills that have been removed or deprecated (e.g. `packmind-create-skill`,
   * `packmind-create-standard`, `packmind-create-command`,
   * `packmind-create-package`, `packmind-cli-list-commands`) are no longer
   * deployed but must remain here so they are cleaned up from users' machines
   * on the next deployment.
   */
  public static getDefaultSkillSlugs(): string[] {
    return [
      'packmind-create-skill',
      'packmind-create-standard',
      'packmind-onboard',
      'packmind-create-command',
      'packmind-create-package',
      'packmind-cli-list-commands',
      'packmind-update-playbook',
    ];
  }

  public deployDefaultSkills(
    options: DeployDefaultSkillsOptions = {},
  ): DefaultSkillsDeployResult {
    const filteredDeployers = this.filterDeployers(options);
    const skippedSkillsCount = this.countSkippedDeployers(options);

    const allFileUpdates = filteredDeployers.map((deployer) =>
      deployer.deploy(this.agentName, this.skillsFolderPath, {
        includeNext: options.includeBeta,
      }),
    );

    const deployedSkills: DefaultSkillMetadata[] = filteredDeployers.map(
      (deployer) => ({
        slug: deployer.slug,
        name: deployer.name,
        version: deployer.version,
      }),
    );

    return {
      fileUpdates: {
        createOrUpdate: allFileUpdates.flatMap(
          (updates) => updates.createOrUpdate,
        ),
        delete: allFileUpdates.flatMap((updates) => updates.delete),
      },
      skippedSkillsCount,
      deployedSkills,
    };
  }

  private filterDeployers(
    options: DeployDefaultSkillsOptions,
  ): ISkillDeployer[] {
    const { cliVersion, includeBeta, excludeDeprecated } = options;

    if (includeBeta) {
      return this.skillDeployers;
    }

    if (excludeDeprecated) {
      return this.skillDeployers.filter((deployer) => !deployer.isDeprecated());
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
