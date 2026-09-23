import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CaptureCommandWithPackagesCommand,
  CaptureCommandWithPackagesResponse,
  IAccountsPort,
  ICaptureCommandWithPackagesUseCase,
  IDeploymentPort,
  ISpacesPort,
  Package,
  createOrganizationId,
  createSpaceId,
} from '@packmind/types';
import { CommandSpaceNotAccessibleError } from '../../../domain/errors';
import { CaptureCommandUseCase } from '../captureCommand/CaptureCommandUseCase';

const origin = 'CaptureRecipeWithPackagesUseCase';

export class CaptureCommandWithPackagesUseCase
  extends AbstractMemberUseCase<
    CaptureCommandWithPackagesCommand,
    CaptureCommandWithPackagesResponse
  >
  implements ICaptureCommandWithPackagesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly captureCommandUseCase: CaptureCommandUseCase,
    private readonly deploymentsPort: IDeploymentPort,
    private readonly spacesPort: ISpacesPort,
  ) {
    super(accountsPort, new PackmindLogger(origin));
    this.logger.info('CaptureRecipeWithPackagesUseCase initialized');
  }

  async executeForMembers(
    command: CaptureCommandWithPackagesCommand & MemberContext,
  ): Promise<CaptureCommandWithPackagesResponse> {
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

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new CommandSpaceNotAccessibleError(spaceId, organizationId);
    }

    this.logger.info('Capturing recipe', { name });
    const recipe = await this.captureCommandUseCase.execute({
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

    if (packageSlugs.length > 0) {
      this.logger.info('Adding recipe to packages', {
        recipeId: recipe.id,
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
              'Package does not belong to same space as recipe, skipping',
              {
                packageSlug: pkg.slug,
                packageSpaceId: pkg.spaceId,
                recipeSpaceId: spaceId,
              },
            );
            continue;
          }

          await this.deploymentsPort.addArtefactsToPackage({
            userId,
            spaceId: createSpaceId(spaceId),
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
