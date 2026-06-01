import { FileUpdates } from '@packmind/types';
import { CliListCommandsDeployer } from './CliListCommandsDeployer';
import { CreatePackageDeployer } from './CreatePackageDeployer';
import { ISkillDeployer } from './IDefaultSkillDeployer';
import { OnboardDeployer } from './OnboardDeployer';
import { UpdatePlaybookDeployer } from './UpdatePlaybookDeployer';
import { DeployDefaultSkillsOptions } from '../../../domain/repository/ICodingAgentDeployer';

/**
 * Per-skill metadata emitted by `DefaultSkillsDeployer.deployDefaultSkills`
 * for each concrete deployer that actually ran.
 *
 * Consumed by `DefaultSkillsMetadataEnricher` to stamp artifact metadata
 * onto the deployer's `FileModification[]` so downstream lockfile entries
 * carry `artifactType`, `artifactSlug`, `artifactName`, `artifactVersion`
 * and `source: 'default'` markers.
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
   * Metadata for the default skills that were actually deployed in this run.
   * Filtered by the same `filterDeployers` pass used to compute `fileUpdates`,
   * so the deployed slugs here are 1:1 with the files emitted in
   * `fileUpdates.createOrUpdate`.
   */
  deployedSkills: DefaultSkillMetadata[];
};

export class DefaultSkillsDeployer {
  private readonly skillDeployers: ISkillDeployer[] = [
    new OnboardDeployer(),
    new CreatePackageDeployer(),
    new CliListCommandsDeployer(),
    new UpdatePlaybookDeployer(),
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
