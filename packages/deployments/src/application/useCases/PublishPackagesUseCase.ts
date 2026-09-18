import {
  IPublishPackages,
  PublishPackagesCommand,
  PackagesDeployment,
  Package,
  PackageId,
  CommandVersionId,
  StandardVersionId,
  SkillVersionId,
  PublishArtifactsCommand,
  ICommandsPort,
  IStandardsPort,
  ISkillsPort,
  IDeploymentPort,
  ISpacesPort,
  SpaceId,
  createDistributedPackageId,
  createPackagesDeploymentId,
  Distribution,
  OrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { PackageService } from '../services/PackageService';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { PackageNotFoundError } from '../../domain/errors/PackageNotFoundError';

const origin = 'PublishPackagesUseCase';

type PackageVersionsMap = Map<
  PackageId,
  {
    recipeVersionIds: CommandVersionId[];
    standardVersionIds: StandardVersionId[];
    skillVersionIds: SkillVersionId[];
  }
>;

export class PublishPackagesUseCase implements IPublishPackages {
  constructor(
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly deploymentPort: IDeploymentPort,
    public readonly packageService: PackageService,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly spacesPort: ISpacesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishPackagesCommand,
  ): Promise<PackagesDeployment[]> {
    if (!command.targetIds || command.targetIds.length === 0) {
      throw new Error('targetIds must be provided');
    }

    if (!command.packageIds || command.packageIds.length === 0) {
      throw new Error('packageIds must be provided');
    }

    this.logger.info('Publishing packages', {
      targetIdsCount: command.targetIds.length,
      packageIdsCount: command.packageIds.length,
      organizationId: command.organizationId,
    });

    const packagesById = new Map(
      (
        await this.packageService.getPackagesByIdsInOrganization(
          command.packageIds,
          command.organizationId as OrganizationId,
        )
      ).map((pkg) => [pkg.id, pkg]),
    );
    const packages: Package[] = command.packageIds.map((packageId) => {
      const pkg = packagesById.get(packageId);
      if (!pkg) {
        throw new PackageNotFoundError(packageId);
      }
      return pkg;
    });

    const [latestCommandVersions, latestStandardVersions, latestSkillVersions] =
      await Promise.all([
        this.commandsPort.getLatestCommandVersions(
          packages.flatMap((pkg) => pkg.recipes),
        ),
        this.standardsPort.getLatestStandardVersions(
          packages.flatMap((pkg) => pkg.standards),
        ),
        this.skillsPort.getLatestSkillVersions(
          packages.flatMap((pkg) => pkg.skills),
        ),
      ]);
    const commandVersionIdByCommandId = new Map(
      latestCommandVersions.map((version) => [version.recipeId, version.id]),
    );
    const standardVersionIdByStandardId = new Map(
      latestStandardVersions.map((version) => [version.standardId, version.id]),
    );
    const skillVersionIdBySkillId = new Map(
      latestSkillVersions.map((version) => [version.skillId, version.id]),
    );

    // An artifact with no version of its own is skipped.
    const packageVersionsMap: PackageVersionsMap = new Map();
    for (const pkg of packages) {
      packageVersionsMap.set(pkg.id, {
        recipeVersionIds: pkg.recipes.flatMap(
          (recipeId) => commandVersionIdByCommandId.get(recipeId) ?? [],
        ),
        standardVersionIds: pkg.standards.flatMap(
          (standardId) => standardVersionIdByStandardId.get(standardId) ?? [],
        ),
        skillVersionIds: pkg.skills.flatMap(
          (skillId) => skillVersionIdBySkillId.get(skillId) ?? [],
        ),
      });
    }

    const commandVersionIds = Array.from(commandVersionIdByCommandId.values());
    const standardVersionIds = Array.from(
      standardVersionIdByStandardId.values(),
    );
    const skillVersionIds = Array.from(skillVersionIdBySkillId.values());

    this.logger.info('Resolved package contents', {
      packagesCount: packages.length,
      commandVersionsCount: commandVersionIds.length,
      standardVersionsCount: standardVersionIds.length,
      skillVersionsCount: skillVersionIds.length,
    });

    // Resolve package slugs in the `@<space-slug>/<package-slug>` form used by
    // the CLI so the deployed packmind.json references match across surfaces.
    const spaceSlugCache = new Map<SpaceId, string>();
    const packagesSlugs: string[] = [];
    for (const pkg of packages) {
      const spaceId = pkg.spaceId as SpaceId;
      let spaceSlug = spaceSlugCache.get(spaceId);
      if (spaceSlug === undefined) {
        const space = await this.spacesPort.getSpaceById(spaceId);
        if (!space) {
          throw new Error(`Space ${spaceId} not found for package ${pkg.slug}`);
        }
        spaceSlug = space.slug;
        spaceSlugCache.set(spaceId, spaceSlug);
      }
      packagesSlugs.push(`@${spaceSlug}/${pkg.slug}`);
    }

    // Feeds the lock file that publishArtifacts generates.
    const artifactSpaceIds: Record<string, string> = {};
    const artifactPackageIds: Record<string, string[]> = {};

    for (const pkg of packages) {
      for (const recipeId of pkg.recipes) {
        artifactSpaceIds[recipeId] = pkg.spaceId as string;
        if (!artifactPackageIds[recipeId]) {
          artifactPackageIds[recipeId] = [];
        }
        artifactPackageIds[recipeId].push(pkg.id as string);
      }

      for (const standardId of pkg.standards) {
        artifactSpaceIds[standardId] = pkg.spaceId as string;
        if (!artifactPackageIds[standardId]) {
          artifactPackageIds[standardId] = [];
        }
        artifactPackageIds[standardId].push(pkg.id as string);
      }

      for (const skillId of pkg.skills) {
        artifactSpaceIds[skillId] = pkg.spaceId as string;
        if (!artifactPackageIds[skillId]) {
          artifactPackageIds[skillId] = [];
        }
        artifactPackageIds[skillId].push(pkg.id as string);
      }
    }

    const { distributions } = await this.deploymentPort.publishArtifacts({
      userId: command.userId,
      organizationId: command.organizationId,
      commandVersionIds,
      standardVersionIds,
      skillVersionIds,
      targetIds: command.targetIds,
      packagesSlugs,
      packageIds: command.packageIds,
      artifactSpaceIds,
      artifactPackageIds,
    } as PublishArtifactsCommand);

    await this.storeDistributedPackages(
      packages,
      packageVersionsMap,
      distributions,
    );

    // PackagesDeployment is this use case's response shape, one per distribution.
    const allDeployments: PackagesDeployment[] = distributions.map(
      (distribution) => ({
        id: createPackagesDeploymentId(uuidv4()),
        packages,
        status: distribution.status,
        gitCommit: distribution.gitCommit,
        target: distribution.target,
        error: distribution.error,
        renderModes: distribution.renderModes,
        createdAt: distribution.createdAt,
        authorId: distribution.authorId,
        organizationId: distribution.organizationId,
      }),
    );

    this.logger.info('Successfully published packages', {
      deploymentsCount: allDeployments.length,
    });

    return allDeployments;
  }

  private async storeDistributedPackages(
    packages: Package[],
    packageVersionsMap: PackageVersionsMap,
    distributions: Distribution[],
  ): Promise<void> {
    if (distributions.length === 0) {
      this.logger.info('No distributions to store distributed packages for');
      return;
    }

    this.logger.info('Storing distributed packages', {
      distributionsCount: distributions.length,
      packagesCount: packages.length,
    });

    for (const distribution of distributions) {
      for (const pkg of packages) {
        const versions = packageVersionsMap.get(pkg.id);
        if (!versions) continue;

        const distributedPackageId = createDistributedPackageId(uuidv4());
        await this.distributedPackageRepository.add({
          id: distributedPackageId,
          distributionId: distribution.id,
          packageId: pkg.id,
          standardVersions: [],
          recipeVersions: [],
          skillVersions: [],
          operation: 'add',
        });

        if (versions.standardVersionIds.length > 0) {
          await this.distributedPackageRepository.addStandardVersions(
            distributedPackageId,
            versions.standardVersionIds,
          );
        }

        if (versions.recipeVersionIds.length > 0) {
          await this.distributedPackageRepository.addCommandVersions(
            distributedPackageId,
            versions.recipeVersionIds,
          );
        }

        if (versions.skillVersionIds.length > 0) {
          await this.distributedPackageRepository.addSkillVersions(
            distributedPackageId,
            versions.skillVersionIds,
          );
        }
      }

      this.logger.info('Distributed packages stored', {
        distributionId: distribution.id,
        targetId: distribution.target.id,
        packagesCount: packages.length,
      });
    }
  }
}
