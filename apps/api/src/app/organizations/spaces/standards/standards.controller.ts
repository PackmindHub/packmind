import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  CreateStandardRuleInput,
  CreateStandardSamplesResponse,
  GetStandardByIdResponse,
  ListStandardsBySpaceResponse,
  OrganizationId,
  RuleId,
  SampleInput,
  SpaceId,
  Standard,
  StandardId,
  StandardVersion,
} from '@packmind/types';
import { StandardsService } from './standards.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';

const origin = 'OrganizationsSpacesStandardsController';

/**
 * Controller for space-scoped standard routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/standards (inherited via RouterModule in AppModule)
 *
 * This controller provides space-scoped standard endpoints within organizations.
 * The path is inherited from the RouterModule configuration in AppModule:
 * - Parent: /organizations/:orgId/spaces/:spaceId (from OrganizationsSpacesModule)
 * - This controller: (empty, inherits from /standards path in RouterModule)
 * - Final path: /organizations/:orgId/spaces/:spaceId/standards
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard ensure proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesStandardsController {
  constructor(
    private readonly standardsService: StandardsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesStandardsController initialized');
  }

  /**
   * Get all standards for a space within an organization
   * GET /organizations/:orgId/spaces/:spaceId/standards
   */
  @Get()
  async getStandards(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListStandardsBySpaceResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/standards - Fetching standards',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      return await this.standardsService.getStandardsBySpace(
        spaceId,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/standards - Failed to fetch standards',
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
   * Create a new standard within a space
   * POST /organizations/:orgId/spaces/:spaceId/standards
   */
  @Post()
  async createStandard(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    standard: {
      name: string;
      description: string;
      rules: CreateStandardRuleInput[];
      scope?: string | null;
      originSkill?: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Standard> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/standards - Creating standard',
      {
        organizationId,
        spaceId,
        standardName: standard.name,
        userId,
      },
    );

    try {
      // Determine creation method based on client source
      const method = request.clientSource === 'cli' ? 'cli' : 'blank';

      return await this.standardsService.createStandard(
        standard,
        organizationId,
        userId,
        spaceId,
        request.clientSource,
        method,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/standards - Failed to create standard',
        {
          organizationId,
          spaceId,
          standardName: standard.name,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get a single standard by ID within a space
   * GET /organizations/:orgId/spaces/:spaceId/standards/:standardId
   */
  @Get(':standardId')
  async getStandardById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetStandardByIdResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId - Fetching standard',
      {
        organizationId,
        spaceId,
        standardId,
      },
    );

    try {
      return await this.standardsService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId - Failed to fetch standard',
        {
          organizationId,
          spaceId,
          standardId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Create standards from predefined samples
   * POST /organizations/:orgId/spaces/:spaceId/standards/samples
   *
   * Note: This route must be defined BEFORE @Post(':standardId') to ensure
   * NestJS matches the literal 'samples' path before the parameterized route.
   */
  @Post('samples')
  async createStandardSamples(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { samples: SampleInput[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateStandardSamplesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/standards/samples - Creating standards from samples',
      {
        organizationId,
        spaceId,
        samplesCount: body.samples?.length,
        userId,
      },
    );

    try {
      if (!body.samples || !Array.isArray(body.samples)) {
        throw new BadRequestException('samples must be an array');
      }

      if (body.samples.length === 0) {
        throw new BadRequestException('samples array cannot be empty');
      }

      for (let i = 0; i < body.samples.length; i++) {
        const sample = body.samples[i];
        if (
          !sample.type ||
          (sample.type !== 'language' && sample.type !== 'framework')
        ) {
          throw new BadRequestException(
            `Sample ${i} must have a valid type ('language' or 'framework')`,
          );
        }
        if (!sample.id || typeof sample.id !== 'string') {
          throw new BadRequestException(`Sample ${i} must have a valid id`);
        }
      }

      const result = await this.standardsService.createStandardSamples(
        organizationId,
        spaceId,
        userId,
        body.samples,
      );

      this.logger.info(
        'POST /organizations/:orgId/spaces/:spaceId/standards/samples - Standards created from samples',
        {
          organizationId,
          spaceId,
          createdCount: result.created.length,
          errorsCount: result.errors.length,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (!(error instanceof BadRequestException)) {
        this.logger.error(
          'POST /organizations/:orgId/spaces/:spaceId/standards/samples - Failed to create standards from samples',
          {
            organizationId,
            spaceId,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Update a standard within a space
   * POST /organizations/:orgId/spaces/:spaceId/standards/:standardId
   */
  @Post(':standardId')
  async updateStandard(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Body()
    standard: {
      name: string;
      description: string;
      rules: Array<{ id: RuleId; content: string }>;
      scope?: string | null;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Standard> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId - Updating standard',
      {
        organizationId,
        spaceId,
        standardId,
        standardName: standard.name,
        userId,
      },
    );

    try {
      // Validate request body
      if (!standard.name || typeof standard.name !== 'string') {
        this.logger.error(
          'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId - Standard name is required',
        );
        throw new BadRequestException('Standard name is required');
      }

      if (!standard.description || typeof standard.description !== 'string') {
        this.logger.error(
          'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId - Standard description is required',
        );
        throw new BadRequestException('Standard description is required');
      }

      if (!standard.rules || !Array.isArray(standard.rules)) {
        this.logger.error(
          'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId - Rules array is required',
        );
        throw new BadRequestException('Rules array is required');
      }

      // Validate each rule
      for (let i = 0; i < standard.rules.length; i++) {
        const rule = standard.rules[i];
        if (!rule.content || typeof rule.content !== 'string') {
          this.logger.error(
            `POST /organizations/:orgId/spaces/:spaceId/standards/:standardId - Rule ${i} content is required`,
          );
          throw new BadRequestException(`Rule ${i} content is required`);
        }
      }

      return await this.standardsService.updateStandard(
        standardId,
        standard,
        organizationId,
        userId,
        spaceId,
        request.clientSource,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/standards/:standardId - Failed to update standard',
        {
          organizationId,
          spaceId,
          standardId,
          standardName: standard.name,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get all versions of a standard within a space
   * GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/versions
   */
  @Get(':standardId/versions')
  async getStandardVersions(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<StandardVersion[]> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/versions - Fetching standard versions',
      {
        organizationId,
        spaceId,
        standardId,
        userId,
      },
    );

    try {
      // Validate that the standard belongs to the specified space
      const standardResponse = await this.standardsService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );

      if (!standardResponse || !standardResponse.standard) {
        throw new NotFoundException(
          `Standard with ID ${standardId} not found in organization ${organizationId} and space ${spaceId}`,
        );
      }

      if (standardResponse.standard.spaceId !== spaceId) {
        throw new NotFoundException(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      const versions =
        await this.standardsService.getStandardVersionsById(standardId);

      this.logger.info(
        'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/versions - Versions fetched successfully',
        {
          organizationId,
          spaceId,
          standardId,
          count: versions.length,
        },
      );

      return versions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (!(error instanceof NotFoundException)) {
        this.logger.error(
          'GET /organizations/:orgId/spaces/:spaceId/standards/:standardId/versions - Failed to fetch versions',
          {
            organizationId,
            spaceId,
            standardId,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Delete a standard within a space
   * DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId
   */
  @Delete(':standardId')
  async deleteStandard(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('standardId') standardId: StandardId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId - Deleting standard',
      {
        organizationId,
        spaceId,
        standardId,
        userId,
      },
    );

    try {
      // Validate that the standard belongs to the specified space
      const standardResponse = await this.standardsService.getStandardById(
        standardId,
        organizationId,
        spaceId,
        userId,
      );

      if (!standardResponse || !standardResponse.standard) {
        throw new NotFoundException(
          `Standard with ID ${standardId} not found in organization ${organizationId} and space ${spaceId}`,
        );
      }

      if (standardResponse.standard.spaceId !== spaceId) {
        throw new NotFoundException(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      }

      await this.standardsService.deleteStandard({
        standardId,
        userId,
        organizationId,
        source: request.clientSource,
      });

      this.logger.info(
        'DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId - Standard deleted successfully',
        {
          organizationId,
          spaceId,
          standardId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (!(error instanceof NotFoundException)) {
        this.logger.error(
          'DELETE /organizations/:orgId/spaces/:spaceId/standards/:standardId - Failed to delete standard',
          {
            organizationId,
            spaceId,
            standardId,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }

  /**
   * Delete multiple standards within a space
   * DELETE /organizations/:orgId/spaces/:spaceId/standards
   */
  @Delete()
  async deleteStandardsBatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { standardIds: StandardId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/standards - Deleting standards batch',
      {
        organizationId,
        spaceId,
        standardIds: body.standardIds,
        count: body.standardIds?.length,
        userId,
      },
    );

    try {
      if (!body.standardIds || !Array.isArray(body.standardIds)) {
        throw new BadRequestException('standardIds must be an array');
      }

      if (body.standardIds.length === 0) {
        throw new BadRequestException('standardIds array cannot be empty');
      }

      // Validate that all standards belong to the specified space
      for (const standardId of body.standardIds) {
        const standardResponse = await this.standardsService.getStandardById(
          standardId,
          organizationId,
          spaceId,
          userId,
        );

        if (!standardResponse || !standardResponse.standard) {
          throw new NotFoundException(
            `Standard with ID ${standardId} not found in organization ${organizationId} and space ${spaceId}`,
          );
        }

        if (standardResponse.standard.spaceId !== spaceId) {
          throw new NotFoundException(
            `Standard ${standardId} does not belong to space ${spaceId}`,
          );
        }
      }

      await this.standardsService.deleteStandardsBatch({
        standardIds: body.standardIds,
        userId: userId.toString(),
        organizationId: organizationId.toString(),
        source: request.clientSource,
      });

      this.logger.info(
        'DELETE /organizations/:orgId/spaces/:spaceId/standards - Standards batch deleted successfully',
        {
          organizationId,
          spaceId,
          count: body.standardIds.length,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException)
      ) {
        this.logger.error(
          'DELETE /organizations/:orgId/spaces/:spaceId/standards - Failed to delete standards batch',
          {
            organizationId,
            spaceId,
            standardIds: body?.standardIds,
            userId,
            error: errorMessage,
          },
        );
      }

      throw error;
    }
  }
}
