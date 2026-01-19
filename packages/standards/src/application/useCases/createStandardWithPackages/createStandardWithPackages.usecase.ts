import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
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
import { CreateStandardWithExamplesUsecase } from '../createStandardWithExamples/createStandardWithExamples.usecase';

const origin = 'CreateStandardWithPackagesUsecase';

export class CreateStandardWithPackagesUsecase
  extends AbstractMemberUseCase<
    CreateStandardWithPackagesCommand,
    CreateStandardWithPackagesResponse
  >
  implements ICreateStandardWithPackagesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly createStandardWithExamplesUsecase: CreateStandardWithExamplesUsecase,
    private readonly deploymentsPort: IDeploymentPort,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('CreateStandardWithPackagesUsecase initialized');
  }

  async executeForMembers(
    command: CreateStandardWithPackagesCommand & MemberContext,
  ): Promise<CreateStandardWithPackagesResponse> {
    const {
      spaceId,
      name,
      description,
      summary,
      scope,
      rules,
      packageSlugs = [],
      userId,
      organizationId,
      source = 'ui',
    } = command;

    this.logger.info('Creating standard with packages', {
      name,
      spaceId,
      rulesCount: rules.length,
      packageSlugsCount: packageSlugs.length,
    });

    // Step 1: Validate space exists and belongs to organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== organizationId) {
      throw new Error(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    }

    // Step 2: Create the standard using CreateStandardWithExamplesUsecase
    this.logger.info('Creating standard with examples', { name });
    const standard =
      await this.createStandardWithExamplesUsecase.createStandardWithExamples({
        name,
        description,
        summary: summary || null,
        rules,
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(userId),
        scope: scope || null,
        spaceId,
        source,
      });

    this.logger.info('Standard created successfully', {
      standardId: standard.id,
      name,
    });

    // Step 3: If packageSlugs provided, add standard to packages
    if (packageSlugs.length > 0) {
      this.logger.info('Adding standard to packages', {
        standardId: standard.id,
        packageSlugsCount: packageSlugs.length,
      });

      try {
        // Fetch packages by slugs to validate they exist and get their IDs
        const packages = await this.fetchPackagesBySlugs(
          packageSlugs,
          organizationId,
          userId,
        );

        // Validate all packages belong to the same space as the standard
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

          // Add standard to package
          await this.deploymentsPort.addArtefactsToPackage({
            userId,
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
        // Log error but don't fail the standard creation
        this.logger.error(
          'Failed to add standard to packages, standard created successfully but package associations failed',
          {
            standardId: standard.id,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Don't throw - standard was created successfully
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

    // List all packages for the organization
    const { packages } = await this.deploymentsPort.listPackages({
      userId,
      organizationId: createOrganizationId(organizationId),
    });

    // Filter to only the requested slugs
    const requestedPackages = packages.filter((pkg) =>
      slugs.includes(pkg.slug),
    );

    // Log any missing packages
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
