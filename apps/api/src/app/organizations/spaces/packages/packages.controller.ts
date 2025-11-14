import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  CreatePackageResponse,
  DeletePackagesBatchResponse,
  GetPackageByIdResponse,
  ListPackagesBySpaceResponse,
  UpdatePackageResponse,
  OrganizationId,
  PackageId,
  RecipeId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { DeploymentsService } from '../../../deployments/deployments.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';

const origin = 'OrganizationsSpacesPackagesController';

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
 * Both OrganizationAccessGuard and SpaceAccessGuard ensure proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
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
  ): Promise<ListPackagesBySpaceResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/packages - Fetching packages',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      return await this.deploymentsService.listPackagesBySpace({
        userId,
        organizationId,
        spaceId,
      });
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
   * Get a specific package by ID
   * GET /organizations/:orgId/spaces/:spaceId/packages/:packageId
   */
  @Get(':packageId')
  async getPackageById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('packageId') packageId: PackageId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetPackageByIdResponse> {
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
      return await this.deploymentsService.getPackageById({
        userId,
        organizationId,
        spaceId,
        packageId,
      });
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
      recipeIds: RecipeId[];
      standardIds: StandardId[];
    },
  ): Promise<CreatePackageResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/packages - Creating package',
      {
        organizationId,
        spaceId,
        name: body.name,
      },
    );

    try {
      return await this.deploymentsService.createPackage({
        userId,
        organizationId,
        spaceId,
        name: body.name,
        description: body.description,
        recipeIds: body.recipeIds,
        standardIds: body.standardIds,
      });
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
      recipeIds: RecipeId[];
      standardIds: StandardId[];
    },
  ): Promise<UpdatePackageResponse> {
    const userId = request.user.userId;

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
      return await this.deploymentsService.updatePackage({
        userId,
        organizationId,
        spaceId,
        packageId,
        name: body.name,
        description: body.description,
        recipeIds: body.recipeIds,
        standardIds: body.standardIds,
      });
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
