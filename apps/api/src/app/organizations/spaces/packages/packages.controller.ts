import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  AddArtefactsToPackageResponse,
  CreatePackageResponse,
  DeletePackagesBatchResponse,
  GetPackageByIdResponse,
  GetPackageSummaryResponse,
  ListPackagesBySpaceResponse,
  UpdatePackageResponse,
  OrganizationId,
  Package,
  PackageId,
  PackageResponse,
  CommandId,
  SkillId,
  SpaceId,
  StandardId,
  AddArtefactsToPackageCommand,
} from '@packmind/types';
import { DeploymentsService } from '../../deployments/deployments.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';

const origin = 'OrganizationsSpacesPackagesController';

/**
 * Controller-level wire responses for package endpoints. SUPERSET for the
 * recipes→commands rename: each maps the persisted `Package` (which keeps its
 * `recipes` field) to a {@link PackageResponse} that also carries a
 * command-named twin `commands` with the same value. The persisted entity is
 * never modified — the twin is added here at the controller boundary.
 */
type GetPackageByIdApiResponse = Omit<GetPackageByIdResponse, 'package'> & {
  package: PackageResponse;
};
type ListPackagesBySpaceApiResponse = Omit<
  ListPackagesBySpaceResponse,
  'packages'
> & {
  packages: PackageResponse[];
};
type CreatePackageApiResponse = Omit<CreatePackageResponse, 'package'> & {
  package: PackageResponse;
};
type UpdatePackageApiResponse = Omit<UpdatePackageResponse, 'package'> & {
  package: PackageResponse;
};
type AddArtefactsToPackageApiResponse = Omit<
  AddArtefactsToPackageResponse,
  'package'
> & {
  package: PackageResponse;
};

const toPackageResponse = (pkg: Package): PackageResponse => ({
  ...pkg,
  // Command-named twin of `recipes` (superset); same value.
  commands: pkg.recipes,
});

/**
 * Controller for space-scoped package routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/packages (inherited via RouterModule in AppModule)
 *
 * This controller provides space-scoped package endpoints within organizations.
 * The path is inherited from the RouterModule configuration in AppModule:
 * - Parent: /organizations/:orgId/spaces/:spaceId (from OrganizationsSpacesModule)
 * - This controller: (empty, inherits from /packages path in RouterModule)
 * - Final path: /organizations/:orgId/spaces/:spaceId/packages
 *
 * OrganizationAccessGuard ensures proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationsSpacesPackagesController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesPackagesController initialized');
  }

  /**
   * Get all packages for a space within an organization
   * GET /organizations/:orgId/spaces/:spaceId/packages
   */
  @Get()
  async getPackages(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListPackagesBySpaceApiResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/packages - Fetching packages',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      const response = await this.deploymentsService.listPackagesBySpace({
        userId,
        organizationId,
        spaceId,
      });
      return {
        ...response,
        packages: response.packages.map(toPackageResponse),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/packages - Failed to fetch packages',
        {
          organizationId,
          spaceId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get a package summary by slug
   * GET /organizations/:orgId/spaces/:spaceId/packages/summary/:slug
   */
  @Get('summary/:slug')
  async getPackageSummaryBySlug(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('slug') slug: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetPackageSummaryResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/packages/summary/:slug - Fetching package summary',
      { organizationId, spaceId, slug },
    );

    try {
      return await this.deploymentsService.getPackageSummary({
        userId,
        organizationId,
        spaceId,
        slug,
        source: request.clientSource,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/packages/summary/:slug - Failed to fetch package summary',
        { organizationId, spaceId, slug, error: errorMessage },
      );
      if (error instanceof Error && error.message.includes('does not exist')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Get a specific package by ID
   * GET /organizations/:orgId/spaces/:spaceId/packages/:packageId
   */
  @Get(':packageId')
  async getPackageById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('packageId') packageId: PackageId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetPackageByIdApiResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/packages/:packageId - Fetching package',
      {
        organizationId,
        spaceId,
        packageId,
      },
    );

    try {
      const response = await this.deploymentsService.getPackageById({
        userId,
        organizationId,
        spaceId,
        packageId,
      });
      return { ...response, package: toPackageResponse(response.package) };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/packages/:packageId - Failed to fetch package',
        {
          organizationId,
          spaceId,
          packageId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Create a new package in a space within an organization
   * POST /organizations/:orgId/spaces/:spaceId/packages
   */
  @Post()
  async createPackage(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      description: string;
      commandIds?: CommandId[];
      recipeIds?: CommandId[];
      standardIds: StandardId[];
      skillIds?: SkillId[];
      originSkill?: string;
    },
  ): Promise<CreatePackageApiResponse> {
    const userId = request.user.userId;

    // Accept BOTH keys: new `commandIds` wins, legacy `recipeIds` fallback.
    const recipeIds = body.commandIds ?? body.recipeIds ?? [];

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/packages - Creating package',
      {
        organizationId,
        spaceId,
        name: body.name,
      },
    );

    try {
      const response = await this.deploymentsService.createPackage({
        userId,
        organizationId,
        spaceId,
        name: body.name,
        description: body.description,
        recipeIds,
        standardIds: body.standardIds,
        skillIds: body.skillIds,
        originSkill: body.originSkill,
      });
      return { ...response, package: toPackageResponse(response.package) };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/packages - Failed to create package',
        {
          organizationId,
          spaceId,
          name: body.name,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Update an existing package in a space within an organization
   * PATCH /organizations/:orgId/spaces/:spaceId/packages/:packageId
   */
  @Patch(':packageId')
  async updatePackage(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('packageId') packageId: PackageId,
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      description: string;
      commandIds?: CommandId[];
      recipeIds?: CommandId[];
      standardIds: StandardId[];
      skillsIds?: SkillId[];
    },
  ): Promise<UpdatePackageApiResponse> {
    const userId = request.user.userId;

    // Accept BOTH keys: new `commandIds` wins, legacy `recipeIds` fallback.
    const recipeIds = body.commandIds ?? body.recipeIds ?? [];

    this.logger.info(
      'PATCH /organizations/:orgId/spaces/:spaceId/packages/:packageId - Updating package',
      {
        organizationId,
        spaceId,
        packageId,
        name: body.name,
      },
    );

    try {
      const response = await this.deploymentsService.updatePackage({
        userId,
        organizationId,
        spaceId,
        packageId,
        name: body.name,
        description: body.description,
        recipeIds,
        standardIds: body.standardIds,
        skillsIds: body.skillsIds ?? [],
      });
      return { ...response, package: toPackageResponse(response.package) };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PATCH /organizations/:orgId/spaces/:spaceId/packages/:packageId - Failed to update package',
        {
          organizationId,
          spaceId,
          packageId,
          name: body.name,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Add artifacts to an existing package
   * POST /organizations/:orgId/spaces/:spaceId/packages/:packageId/add-artifacts
   */
  @Post(':packageId/add-artifacts')
  async addArtefactsToPackage(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('packageId') packageId: PackageId,
    @Req() request: AuthenticatedRequest,
    @Body()
    body: AddArtefactsToPackageCommand & { commandIds?: CommandId[] },
  ): Promise<AddArtefactsToPackageApiResponse> {
    const userId = request.user.userId;

    // Accept BOTH keys: new `commandIds` wins, legacy `recipeIds` fallback.
    const recipeIds = body.commandIds ?? body.recipeIds;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/packages/:packageId/add-artifacts',
      { organizationId, spaceId, packageId },
    );

    const response = await this.deploymentsService.addArtefactsToPackage({
      userId,
      spaceId,
      organizationId,
      packageId: packageId,
      standardIds: body.standardIds,
      recipeIds,
      skillIds: body.skillIds,
      originSkill: body.originSkill,
    });
    return { ...response, package: toPackageResponse(response.package) };
  }

  /**
   * Delete a single package
   * DELETE /organizations/:orgId/spaces/:spaceId/packages/:packageId
   */
  @Delete(':packageId')
  async deletePackage(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('packageId') packageId: PackageId,
    @Req() request: AuthenticatedRequest,
  ): Promise<DeletePackagesBatchResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/packages/:packageId - Deleting package',
      {
        organizationId,
        spaceId,
        packageId,
      },
    );

    try {
      return await this.deploymentsService.deletePackagesBatch({
        userId,
        organizationId,
        spaceId,
        packageIds: [packageId],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/spaces/:spaceId/packages/:packageId - Failed to delete package',
        {
          organizationId,
          spaceId,
          packageId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Delete multiple packages in batch
   * DELETE /organizations/:orgId/spaces/:spaceId/packages
   */
  @Delete()
  async deletePackagesBatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
    @Body() body: { packageIds: PackageId[] },
  ): Promise<DeletePackagesBatchResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/packages - Deleting packages batch',
      {
        organizationId,
        spaceId,
        packageIds: body.packageIds,
        count: body.packageIds.length,
      },
    );

    try {
      return await this.deploymentsService.deletePackagesBatch({
        userId,
        organizationId,
        spaceId,
        packageIds: body.packageIds,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/spaces/:spaceId/packages - Failed to delete packages batch',
        {
          organizationId,
          spaceId,
          packageIds: body.packageIds,
          count: body.packageIds.length,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
