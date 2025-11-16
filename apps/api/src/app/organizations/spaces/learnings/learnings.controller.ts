import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ILearningsPort } from '@packmind/types';
import { InjectLearningsAdapter } from '../../../shared/HexaInjection';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  AcceptKnowledgePatchResponse,
  GetKnowledgePatchResponse,
  GetTopicByIdResponse,
  GetTopicsStatsResponse,
  KnowledgePatchId,
  KnowledgePatchStatus,
  ListKnowledgePatchesResponse,
  ListTopicsResponse,
  OrganizationId,
  RejectKnowledgePatchResponse,
  SpaceId,
  TopicId,
} from '@packmind/types';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';

const origin = 'OrganizationsSpacesLearningsController';

/**
 * Controller for space-scoped learnings routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/learnings (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesLearningsController {
  constructor(
    @InjectLearningsAdapter()
    private readonly learningsAdapter: ILearningsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesLearningsController initialized');
  }

  /**
   * Get all knowledge patches for a space, optionally filtered by status
   * GET /organizations/:orgId/spaces/:spaceId/learnings/patches?status=pending_review
   */
  @Get('patches')
  async listPatches(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Query('status') status: KnowledgePatchStatus | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListKnowledgePatchesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/learnings/patches - Fetching patches',
      {
        organizationId,
        spaceId,
        status: status || 'all',
      },
    );

    try {
      return await this.learningsAdapter.listKnowledgePatches({
        spaceId,
        status,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/learnings/patches - Failed to fetch patches',
        {
          organizationId,
          spaceId,
          status,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get a single knowledge patch by ID
   * GET /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId
   */
  @Get('patches/:patchId')
  async getPatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('patchId') patchId: KnowledgePatchId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetKnowledgePatchResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId - Fetching patch',
      {
        organizationId,
        spaceId,
        patchId,
      },
    );

    try {
      return await this.learningsAdapter.getKnowledgePatch({
        patchId,
        spaceId,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId - Failed to fetch patch',
        {
          organizationId,
          spaceId,
          patchId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Accept a knowledge patch
   * POST /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId/accept
   */
  @Post('patches/:patchId/accept')
  async acceptPatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('patchId') patchId: KnowledgePatchId,
    @Body() body: { reviewNotes?: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<AcceptKnowledgePatchResponse> {
    const userId = request.user.userId;
    const { reviewNotes } = body;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId/accept - Accepting patch',
      {
        organizationId,
        spaceId,
        patchId,
        userId,
      },
    );

    try {
      return await this.learningsAdapter.acceptKnowledgePatch({
        patchId,
        spaceId,
        reviewedBy: userId,
        reviewNotes,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId/accept - Failed to accept patch',
        {
          organizationId,
          spaceId,
          patchId,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Reject a knowledge patch
   * POST /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId/reject
   */
  @Post('patches/:patchId/reject')
  async rejectPatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('patchId') patchId: KnowledgePatchId,
    @Body() body: { reviewNotes: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<RejectKnowledgePatchResponse> {
    const userId = request.user.userId;
    const { reviewNotes } = body;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId/reject - Rejecting patch',
      {
        organizationId,
        spaceId,
        patchId,
        userId,
      },
    );

    try {
      return await this.learningsAdapter.rejectKnowledgePatch({
        patchId,
        spaceId,
        reviewedBy: userId,
        reviewNotes,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/learnings/patches/:patchId/reject - Failed to reject patch',
        {
          organizationId,
          spaceId,
          patchId,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Distill all pending topics in a space
   * POST /organizations/:orgId/spaces/:spaceId/learnings/distill-all
   */
  @Post('distill-all')
  async distillAllPendingTopics(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/learnings/distill-all - Distilling all pending topics',
      {
        organizationId,
        spaceId,
        userId,
      },
    );

    try {
      return await this.learningsAdapter.distillAllPendingTopics({
        spaceId,
        userId,
        organizationId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/learnings/distill-all - Failed to distill topics',
        {
          organizationId,
          spaceId,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get topics statistics for a space
   * GET /organizations/:orgId/spaces/:spaceId/learnings/topics/stats
   */
  @Get('topics/stats')
  async getTopicsStats(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetTopicsStatsResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/learnings/topics/stats - Fetching topics stats',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      return await this.learningsAdapter.getTopicsStats({
        spaceId,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/learnings/topics/stats - Failed to fetch topics stats',
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
   * Get all topics for a space
   * GET /organizations/:orgId/spaces/:spaceId/learnings/topics
   */
  @Get('topics')
  async listTopics(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListTopicsResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/learnings/topics - Fetching topics',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      return await this.learningsAdapter.listTopics({
        spaceId,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/learnings/topics - Failed to fetch topics',
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
   * Get a single topic by ID
   * GET /organizations/:orgId/spaces/:spaceId/learnings/topics/:topicId
   */
  @Get('topics/:topicId')
  async getTopic(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('topicId') topicId: TopicId,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetTopicByIdResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/learnings/topics/:topicId - Fetching topic',
      {
        organizationId,
        spaceId,
        topicId,
      },
    );

    try {
      return await this.learningsAdapter.getTopicById({
        topicId,
        spaceId,
        organizationId,
        userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/learnings/topics/:topicId - Failed to fetch topic',
        {
          organizationId,
          spaceId,
          topicId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
