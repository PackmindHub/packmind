import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Standard, StandardId } from '@packmind/standards';
import { OrganizationId } from '@packmind/accounts';
import { SpaceId } from '@packmind/spaces';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  RuleId,
  GetStandardByIdResponse,
  ListStandardsBySpaceResponse,
} from '@packmind/shared';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { StandardsService } from '../../../standards/standards.service';
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
      rules: Array<{ content: string }>;
      scope?: string | null;
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
      return await this.standardsService.createStandard(
        standard,
        organizationId,
        userId,
        spaceId,
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
}
