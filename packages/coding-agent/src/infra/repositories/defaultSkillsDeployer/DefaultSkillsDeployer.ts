import { FileUpdates } from '@packmind/types';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { OnboardDeployer } from './OnboardDeployer';
import { UpdatePlaybookDeployer } from './UpdatePlaybookDeployer';
import { DeployDefaultSkillsOptions } from '../../../domain/repository/ICodingAgentDeployer';

/**
 * Consumed by `enrichDefaultSkillsFileModifications`, which stamps these
 * values onto emitted `FileModification[]` so lockfile entries match the
 * shape of user/package artifact entries.
 */
export type DefaultSkillMetadata = {
  slug: string;
  name: string;
  version: number;
};

export type DefaultSkillsDeployResult = {
  fileUpdates: FileUpdates;
  skippedSkillsCount: number;
  /**
   * Derived from the same `filterDeployers` pass as `fileUpdates`, so these
   * slugs are 1:1 with the files in `fileUpdates.createOrUpdate` — the
   * enricher's path matching depends on that.
   */
  deployedSkills: DefaultSkillMetadata[];
};

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
   * Every default skill Packmind has ever shipped, deliberately broader than
   * `skillDeployers`: agent deployers purge these directories, so a slug that
   * is no longer deployed must stay listed or it is never cleaned up from
   * existing installations.
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
        cliVersion: options.cliVersion,
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
