import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  Package,
  PackageId,
  PackageWithArtefacts,
  Recipe,
  RecipeId,
  Skill,
  SkillId,
  SpaceId,
  Standard,
  StandardId,
  UserId,
  OrganizationId,
} from '@packmind/types';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';

const origin = 'PackageService';

export class PackageService {
  private recipesPort: IRecipesPort | null = null;
  private standardsPort: IStandardsPort | null = null;
  private skillsPort: ISkillsPort | null = null;
  private spacesPort: ISpacesPort | null = null;

  constructor(
    private readonly packageRepository: IPackageRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('PackageService initialized');
  }

  /**
   * Lazily wire the cross-domain ports used to hydrate package artefacts. The
   * adapter calls this once the HexaRegistry has resolved the ports, since they
   * are not available when DeploymentsServices constructs this service.
   */
  setArtefactPorts(ports: {
    recipesPort: IRecipesPort;
    standardsPort: IStandardsPort;
    skillsPort: ISkillsPort;
    spacesPort: ISpacesPort;
  }): void {
    this.recipesPort = ports.recipesPort;
    this.standardsPort = ports.standardsPort;
    this.skillsPort = ports.skillsPort;
    this.spacesPort = ports.spacesPort;
  }

  async findById(packageId: PackageId): Promise<Package | null> {
    this.logger.info('Finding package by ID', {
      packageId,
    });

    try {
      const pkg = await this.packageRepository.findById(packageId);

      if (pkg) {
        this.logger.info('Package found successfully', {
          packageId,
          name: pkg.name,
        });
      } else {
        this.logger.info('Package not found', {
          packageId,
        });
      }

      return pkg;
    } catch (error) {
      this.logger.error('Failed to find package by ID', {
        packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPackagesBySpaceId(spaceId: SpaceId): Promise<Package[]> {
    this.logger.info('Getting packages by space ID', {
      spaceId,
    });

    try {
      const packages = await this.packageRepository.findBySpaceId(spaceId);

      this.logger.info('Packages found by space ID successfully', {
        spaceId,
        count: packages.length,
      });

      return packages;
    } catch (error) {
      this.logger.error('Failed to get packages by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPackagesByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Package[]> {
    this.logger.info('Getting packages by organization ID', {
      organizationId,
    });

    try {
      const packages =
        await this.packageRepository.findByOrganizationId(organizationId);

      this.logger.info('Packages found by organization ID successfully', {
        organizationId,
        count: packages.length,
      });

      return packages;
    } catch (error) {
      this.logger.error('Failed to get packages by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPackagesBySlugsWithArtefacts(
    slugs: string[],
    organizationId: OrganizationId,
  ): Promise<PackageWithArtefacts[]> {
    this.logger.info('Getting packages by slugs with artefacts', {
      slugs,
      count: slugs.length,
      organizationId,
    });

    try {
      const spacesPort = this.requirePort(this.spacesPort, 'spacesPort');
      const spaces = await spacesPort.listSpacesByOrganization(organizationId);
      const spaceIds = spaces.map((space) => space.id);

      const packages = await this.packageRepository.findBySlugsAndSpaceIds(
        slugs,
        spaceIds,
      );
      const result = await this.enrichWithArtefacts(packages);

      this.logger.info('Packages found by slugs with artefacts successfully', {
        requestedCount: slugs.length,
        foundCount: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get packages by slugs with artefacts', {
        slugs,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPackagesBySlugsAndSpaceWithArtefacts(
    slugs: string[],
    spaceId: SpaceId,
  ): Promise<PackageWithArtefacts[]> {
    this.logger.info('Getting packages by slugs and space with artefacts', {
      slugs,
      count: slugs.length,
      spaceId,
    });

    try {
      const packages = await this.packageRepository.findBySlugsAndSpaceIds(
        slugs,
        [spaceId],
      );
      const result = await this.enrichWithArtefacts(packages);

      this.logger.info(
        'Packages found by slugs and space with artefacts successfully',
        {
          requestedCount: slugs.length,
          foundCount: result.length,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Failed to get packages by slugs and space with artefacts',
        {
          slugs,
          spaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  private requirePort<T>(port: T | null, name: string): T {
    if (port == null) {
      throw new Error(
        `PackageService: ${name} is not set. Call setArtefactPorts() before hydrating package artefacts.`,
      );
    }
    return port;
  }

  /**
   * Hydrate packages that carry only artefact IDs into full
   * `PackageWithArtefacts` by fetching each recipe/standard/skill through its
   * domain port. Cross-domain reads stay in the application layer (never the
   * repository), wired via `@packmind/types` ports.
   */
  private async enrichWithArtefacts(
    packages: Package[],
  ): Promise<PackageWithArtefacts[]> {
    if (packages.length === 0) {
      return [];
    }

    const recipesPort = this.requirePort(this.recipesPort, 'recipesPort');
    const standardsPort = this.requirePort(this.standardsPort, 'standardsPort');
    const skillsPort = this.requirePort(this.skillsPort, 'skillsPort');

    const uniqueRecipeIds = [...new Set(packages.flatMap((p) => p.recipes))];
    const uniqueStandardIds = [
      ...new Set(packages.flatMap((p) => p.standards)),
    ];
    const uniqueSkillIds = [...new Set(packages.flatMap((p) => p.skills))];

    const [recipeEntries, standardEntries, skillEntries] = await Promise.all([
      Promise.all(
        uniqueRecipeIds.map(
          async (id) =>
            [id, await recipesPort.getRecipeByIdInternal(id)] as const,
        ),
      ),
      Promise.all(
        uniqueStandardIds.map(
          async (id) =>
            [
              id,
              await this.loadStandardWithSummary(standardsPort, id),
            ] as const,
        ),
      ),
      Promise.all(
        uniqueSkillIds.map(
          async (id) => [id, await skillsPort.getSkill(id)] as const,
        ),
      ),
    ]);

    const recipesMap = new Map<string, Recipe>();
    for (const [id, recipe] of recipeEntries) {
      if (recipe) recipesMap.set(id, recipe);
    }
    const standardsMap = new Map<string, Standard>();
    for (const [id, standard] of standardEntries) {
      if (standard) standardsMap.set(id, standard);
    }
    const skillsMap = new Map<string, Skill>();
    for (const [id, skill] of skillEntries) {
      if (skill) skillsMap.set(id, skill);
    }

    return packages.map((pkg) => ({
      ...pkg,
      recipes: pkg.recipes
        .map((id) => recipesMap.get(id))
        .filter((r): r is Recipe => r != null),
      standards: pkg.standards
        .map((id) => standardsMap.get(id))
        .filter((s): s is Standard => s != null),
      skills: pkg.skills
        .map((id) => skillsMap.get(id))
        .filter((s): s is Skill => s != null),
    }));
  }

  /**
   * Fetch a standard and attach the summary of its current version, mirroring
   * the previous repository behaviour (summary taken from the StandardVersion
   * matching the standard's `version`).
   */
  private async loadStandardWithSummary(
    standardsPort: IStandardsPort,
    id: StandardId,
  ): Promise<Standard | null> {
    const standard = await standardsPort.getStandard(id);
    if (!standard) {
      return null;
    }
    const versions = await standardsPort.listStandardVersions(id);
    const currentVersion = versions.find((v) => v.version === standard.version);
    return { ...standard, summary: currentVersion?.summary ?? undefined };
  }

  async createPackage(
    pkg: Omit<Package, 'recipes' | 'standards' | 'skills'>,
    recipeIds: RecipeId[],
    standardIds: StandardId[],
    skillIds: SkillId[] = [],
  ): Promise<Package> {
    this.logger.info('Creating package', {
      packageId: pkg.id,
      name: pkg.name,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillIds.length,
    });

    try {
      const packageToCreate: Package = {
        ...pkg,
        recipes: [],
        standards: [],
        skills: [],
      };

      await this.packageRepository.add(packageToCreate);
      await this.packageRepository.addRecipes(pkg.id, recipeIds);
      await this.packageRepository.addStandards(pkg.id, standardIds);
      await this.packageRepository.addSkills(pkg.id, skillIds);

      const savedPackage = await this.packageRepository.findById(pkg.id);
      if (!savedPackage) {
        throw new Error('Failed to retrieve saved package');
      }

      this.logger.info('Package created successfully', {
        packageId: savedPackage.id,
        name: savedPackage.name,
        recipeCount: savedPackage.recipes?.length ?? 0,
        standardCount: savedPackage.standards?.length ?? 0,
        skillCount: savedPackage.skills?.length ?? 0,
      });

      return savedPackage;
    } catch (error) {
      this.logger.error('Failed to create package', {
        packageId: pkg.id,
        name: pkg.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deletePackage(packageId: PackageId, deletedBy: UserId): Promise<void> {
    this.logger.info('Deleting package', {
      packageId,
      deletedBy,
    });

    try {
      await this.packageRepository.deleteById(packageId, deletedBy);

      this.logger.info('Package deleted successfully', {
        packageId,
        deletedBy,
      });
    } catch (error) {
      this.logger.error('Failed to delete package', {
        packageId,
        deletedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deletePackages(
    packageIds: PackageId[],
    deletedBy: UserId,
  ): Promise<void> {
    this.logger.info('Deleting multiple packages', {
      packageIds,
      count: packageIds.length,
      deletedBy,
    });

    try {
      await Promise.all(
        packageIds.map((packageId) =>
          this.packageRepository.deleteById(packageId, deletedBy),
        ),
      );

      this.logger.info('Packages deleted successfully', {
        count: packageIds.length,
        deletedBy,
      });
    } catch (error) {
      this.logger.error('Failed to delete packages', {
        packageIds,
        count: packageIds.length,
        deletedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updatePackage(
    packageId: PackageId,
    name: string,
    description: string,
    recipeIds: RecipeId[],
    standardIds: StandardId[],
    skillIds: SkillId[],
  ): Promise<Package> {
    this.logger.info('Updating package', {
      packageId,
      name,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillIds.length,
    });

    try {
      await this.packageRepository.updatePackageDetails(
        packageId,
        name,
        description,
      );
      await this.packageRepository.setRecipes(packageId, recipeIds);
      await this.packageRepository.setStandards(packageId, standardIds);
      await this.packageRepository.setSkills(packageId, skillIds);

      const updatedPackage = await this.packageRepository.findById(packageId);
      if (!updatedPackage) {
        throw new Error('Failed to retrieve updated package');
      }

      this.logger.info('Package updated successfully', {
        packageId: updatedPackage.id,
        name: updatedPackage.name,
        recipeCount: updatedPackage.recipes?.length ?? 0,
        standardCount: updatedPackage.standards?.length ?? 0,
        skillCount: updatedPackage.skills?.length ?? 0,
      });

      return updatedPackage;
    } catch (error) {
      this.logger.error('Failed to update package', {
        packageId,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
