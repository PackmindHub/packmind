import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  CreateStandardWithPackagesCommand,
  CreateStandardWithPackagesResponse,
  IAccountsPort,
  ICreateStandardWithPackagesUseCase,
  IDeploymentPort,
  ISpacesPort,
  Package,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { StandardSpaceNotAccessibleError } from '../../../domain/errors/StandardSpaceNotAccessibleError';
import { CreateStandardWithExamplesUseCase } from '../createStandardWithExamples/CreateStandardWithExamplesUseCase';
import { MultiplePackagesRequestedError } from '../../../domain/errors/MultiplePackagesRequestedError';

const origin = 'CreateStandardWithPackagesUseCase';

export class CreateStandardWithPackagesUseCase
  extends AbstractSpaceMemberUseCase<
    CreateStandardWithPackagesCommand,
    CreateStandardWithPackagesResponse
  >
  implements ICreateStandardWithPackagesUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly createStandardWithExamplesUseCase: CreateStandardWithExamplesUseCase,
    private readonly deploymentsPort: IDeploymentPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('CreateStandardWithPackagesUseCase initialized');
  }

  async executeForSpaceMembers(
    command: CreateStandardWithPackagesCommand & SpaceMemberContext,
  ): Promise<CreateStandardWithPackagesResponse> {
    const {
      spaceId,
      name,
      description,
      scope,
      rules,
      packageSlugs = [],
      userId,
      organizationId,
      source = 'ui',
      method,
    } = command;

    // Asked before anything is written: the standard does not exist yet, so
    // the only way the placement below can conflict is by being asked for a
    // second package, and discovering that afterwards left a created standard
    // and a swallowed error.
    if (packageSlugs.length > 1) {
      throw new MultiplePackagesRequestedError(packageSlugs);
    }

    this.logger.info('Creating standard with packages', {
      name,
      spaceId,
      rulesCount: rules.length,
      packageSlugsCount: packageSlugs.length,
    });

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new StandardSpaceNotAccessibleError(spaceId, organizationId);
    }

    this.logger.info('Creating standard with examples', { name });
    const standard =
      await this.createStandardWithExamplesUseCase.createStandardWithExamples({
        name,
        description,
        rules,
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(userId),
        scope: scope || null,
        spaceId,
        source,
        method,
      });

    this.logger.info('Standard created successfully', {
      standardId: standard.id,
      name,
    });

    if (packageSlugs.length > 0) {
      this.logger.info('Adding standard to packages', {
        standardId: standard.id,
        packageSlugsCount: packageSlugs.length,
      });

      try {
        const packages = await this.fetchPackagesBySlugs(
          packageSlugs,
          organizationId,
          userId,
        );

        for (const pkg of packages) {
          if (pkg.spaceId !== spaceId) {
            this.logger.warn(
              'Package does not belong to same space as standard, skipping',
              {
                packageSlug: pkg.slug,
                packageSpaceId: pkg.spaceId,
                standardSpaceId: spaceId,
              },
            );
            continue;
          }

          await this.deploymentsPort.addArtefactsToPackage({
            userId,
            spaceId,
            organizationId,
            packageId: pkg.id,
            standardIds: [standard.id],
          });

          this.logger.info('Standard added to package successfully', {
            packageSlug: pkg.slug,
            packageId: pkg.id,
            standardId: standard.id,
          });
        }
      } catch (error) {
        // Swallowed: the standard exists, only its package links failed
        this.logger.error(
          'Failed to add standard to packages, standard created successfully but package associations failed',
          {
            standardId: standard.id,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logger.info('CreateStandardWithPackages completed successfully', {
      standardId: standard.id,
      name,
      packageSlugsCount: packageSlugs.length,
    });

    return { standard };
  }

  private async fetchPackagesBySlugs(
    slugs: string[],
    organizationId: string,
    userId: string,
  ): Promise<Package[]> {
    this.logger.info('Fetching packages by slugs', {
      slugsCount: slugs.length,
      organizationId,
    });

    const { packages } = await this.deploymentsPort.listPackages({
      userId,
      organizationId: createOrganizationId(organizationId),
    });

    const requestedPackages = packages.filter((pkg) =>
      slugs.includes(pkg.slug),
    );

    const foundSlugs = new Set(requestedPackages.map((p) => p.slug));
    const missingSlugs = slugs.filter((slug) => !foundSlugs.has(slug));
    if (missingSlugs.length > 0) {
      this.logger.warn('Some requested packages not found', {
        missingSlugs,
        foundCount: requestedPackages.length,
        requestedCount: slugs.length,
      });
    }

    this.logger.info('Packages fetched successfully', {
      foundCount: requestedPackages.length,
      requestedCount: slugs.length,
    });

    return requestedPackages;
  }
}
