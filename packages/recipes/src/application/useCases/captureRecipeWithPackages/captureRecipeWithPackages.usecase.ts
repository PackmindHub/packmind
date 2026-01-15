import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CaptureRecipeWithPackagesCommand,
  CaptureRecipeWithPackagesResponse,
  IAccountsPort,
  ICaptureRecipeWithPackagesUseCase,
  IDeploymentPort,
  ISpacesPort,
  Package,
  createOrganizationId,
  createSpaceId,
} from '@packmind/types';
import { CaptureRecipeUsecase } from '../captureRecipe/captureRecipe.usecase';

const origin = 'CaptureRecipeWithPackagesUsecase';

export class CaptureRecipeWithPackagesUsecase
  extends AbstractMemberUseCase<
    CaptureRecipeWithPackagesCommand,
    CaptureRecipeWithPackagesResponse
  >
  implements ICaptureRecipeWithPackagesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly captureRecipeUsecase: CaptureRecipeUsecase,
    private readonly deploymentsPort: IDeploymentPort,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('CaptureRecipeWithPackagesUsecase initialized');
  }

  async executeForMembers(
    command: CaptureRecipeWithPackagesCommand & MemberContext,
  ): Promise<CaptureRecipeWithPackagesResponse> {
    const {
      spaceId,
      name,
      summary,
      whenToUse,
      contextValidationCheckpoints,
      steps,
      packageSlugs = [],
      userId,
      organizationId,
      source = 'ui',
    } = command;

    this.logger.info('Creating recipe with packages', {
      name,
      spaceId,
      stepsCount: steps?.length || 0,
      packageSlugsCount: packageSlugs.length,
    });

    // Step 1: Validate space exists and belongs to organization
    const space = await this.spacesPort.getSpaceById(createSpaceId(spaceId));
    if (!space) {
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== organizationId) {
      throw new Error(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    }

    // Step 2: Create the recipe using CaptureRecipeUsecase
    this.logger.info('Capturing recipe', { name });
    const recipe = await this.captureRecipeUsecase.execute({
      name,
      summary,
      whenToUse,
      contextValidationCheckpoints,
      steps,
      organizationId,
      userId,
      spaceId,
      source,
    });

    this.logger.info('Recipe created successfully', {
      recipeId: recipe.id,
      name,
    });

    // Step 3: If packageSlugs provided, add recipe to packages
    if (packageSlugs.length > 0) {
      this.logger.info('Adding recipe to packages', {
        recipeId: recipe.id,
        packageSlugsCount: packageSlugs.length,
      });

      try {
        // Fetch packages by slugs to validate they exist and get their IDs
        const packages = await this.fetchPackagesBySlugs(
          packageSlugs,
          organizationId,
          userId,
        );

        // Validate all packages belong to the same space as the recipe
        for (const pkg of packages) {
          if (pkg.spaceId !== spaceId) {
            this.logger.warn(
              'Package does not belong to same space as recipe, skipping',
              {
                packageSlug: pkg.slug,
                packageSpaceId: pkg.spaceId,
                recipeSpaceId: spaceId,
              },
            );
            continue;
          }

          // Add recipe to package
          await this.deploymentsPort.addArtefactsToPackage({
            userId,
            organizationId,
            packageId: pkg.id,
            recipeIds: [recipe.id],
          });

          this.logger.info('Recipe added to package successfully', {
            packageSlug: pkg.slug,
            packageId: pkg.id,
            recipeId: recipe.id,
          });
        }
      } catch (error) {
        // Log error but don't fail the recipe creation
        this.logger.error(
          'Failed to add recipe to packages, recipe created successfully but package associations failed',
          {
            recipeId: recipe.id,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Don't throw - recipe was created successfully
      }
    }

    this.logger.info('CaptureRecipeWithPackages completed successfully', {
      recipeId: recipe.id,
      name,
      packageSlugsCount: packageSlugs.length,
    });

    return { recipe };
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
