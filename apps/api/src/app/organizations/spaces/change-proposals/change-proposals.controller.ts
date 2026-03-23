import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  AcceptedChangeProposal,
  ApplyCreationChangeProposalsResponse,
  BatchCreateChangeProposalItem,
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  ChangeProposalDecision,
  ChangeProposalId,
  ChangeProposalType,
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  ListChangeProposalsBySpaceResponse,
  OrganizationId,
  PreviewArtifactRenderingCommand,
  RecomputeConflictsResponse,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { ChangeProposalsService } from './change-proposals.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import {
  ChangeProposalPayloadMismatchError,
  UnsupportedChangeProposalTypeError,
} from '@packmind/playbook-change-management';

const origin = 'OrganizationsSpacesChangeProposalsController';

/**
 * Controller for space-scoped change proposal routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/change-proposals (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationsSpacesChangeProposalsController {
  constructor(
    private readonly changeProposalsService: ChangeProposalsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * Check if change proposals already exist
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/check
   */
  @Post('check')
  async checkChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { proposals: BatchCreateChangeProposalItem[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<CheckChangeProposalsResponse> {
    if (!body.proposals || body.proposals.length === 0) {
      throw new BadRequestException('Proposals array must not be empty');
    }

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/check - Checking change proposals',
      {
        organizationId,
        spaceId,
        count: body.proposals.length,
      },
    );

    const command: CheckChangeProposalsCommand = {
      userId: request.user.userId,
      organizationId,
      spaceId,
      proposals: body.proposals,
    };

    return this.changeProposalsService.checkChangeProposals(command);
  }

  /**
   * Batch create change proposals
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch
   */
  @Post('batch')
  async batchCreateChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { proposals: BatchCreateChangeProposalItem[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<BatchCreateChangeProposalsResponse> {
    if (!body.proposals || body.proposals.length === 0) {
      throw new BadRequestException('Proposals array must not be empty');
    }

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch - Batch creating change proposals',
      {
        organizationId,
        spaceId,
        count: body.proposals.length,
      },
    );

    const command: BatchCreateChangeProposalsCommand = {
      userId: request.user.userId,
      organizationId,
      spaceId,
      proposals: body.proposals,
    };

    const result =
      await this.changeProposalsService.batchCreateChangeProposals(command);

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch - Batch creation completed',
      {
        organizationId,
        spaceId,
        created: result.created,
        errors: result.errors.length,
      },
    );

    return result;
  }

  /**
   * Apply or reject creation change proposals (e.g., createCommand)
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/apply
   */
  @Post('apply')
  async applyCreationChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    body: { accepted: AcceptedChangeProposal[]; rejected: ChangeProposalId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<ApplyCreationChangeProposalsResponse> {
    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/apply',
      {
        organizationId,
        spaceId,
        acceptedCount: body.accepted.length,
        rejectedCount: body.rejected.length,
      },
    );

    const result =
      await this.changeProposalsService.applyCreationChangeProposals({
        userId: request.user.userId,
        organizationId,
        spaceId,
        accepted: body.accepted,
        rejected: body.rejected,
      });

    this.logger.info(
      'POST .../change-proposals/apply - Applied creation proposals successfully',
      {
        organizationId,
        spaceId,
        created: Object.entries(result.created).map(
          ([artefactType, artefactIds]) =>
            `${artefactType}: ${artefactIds.length}`,
        ),
      },
    );

    return result;
  }

  /**
   * Create a change proposal
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals
   */
  @Post()
  async createChangeProposal(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: BatchCreateChangeProposalItem,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateChangeProposalResponse<ChangeProposalType>> {
    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals - Creating change proposal',
      {
        organizationId,
        spaceId,
        type: body.type,
      },
    );

    try {
      const command = {
        userId: request.user.userId,
        organizationId,
        spaceId,
        type: body.type,
        artefactId: body.artefactId,
        payload: body.payload,
        captureMode: body.captureMode,
        message: body.message,
      } as unknown as CreateChangeProposalCommand<ChangeProposalType>;

      const result =
        await this.changeProposalsService.createChangeProposal(command);

      this.logger.info(
        'POST /organizations/:orgId/spaces/:spaceId/change-proposals - Change proposal created successfully',
        {
          organizationId,
          spaceId,
          type: body.type,
        },
      );

      return result;
    } catch (error) {
      if (error instanceof UnsupportedChangeProposalTypeError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof ChangeProposalPayloadMismatchError) {
        throw new ConflictException(error.message);
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/change-proposals - Failed to create change proposal',
        {
          organizationId,
          spaceId,
          type: body.type,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * List change proposals grouped by artefact type for a space
   * GET /organizations/:orgId/spaces/:spaceId/grouped
   */
  @Get('grouped')
  async listChangeProposalsBySpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListChangeProposalsBySpaceResponse> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/change-proposals/grouped - Listing grouped change proposals',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      const result =
        await this.changeProposalsService.listChangeProposalsBySpace({
          userId: request.user.userId,
          organizationId,
          spaceId,
        });

      this.logger.info(
        'GET /organizations/:orgId/spaces/:spaceId/change-proposals/grouped - Grouped change proposals listed successfully',
        {
          organizationId,
          spaceId,
          standardsCount: result.standards.length,
          commandsCount: result.commands.length,
          skillsCount: result.skills.length,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/grouped-change-proposals - Failed to list grouped change proposals',
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
   * Recompute conflicts for change proposals with optional decisions
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/recompute-conflicts
   */
  @Post('recompute-conflicts')
  async recomputeConflicts(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    body: {
      artefactId: StandardId | RecipeId | SkillId;
      decisions: Record<ChangeProposalId, ChangeProposalDecision>;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<RecomputeConflictsResponse> {
    if (!body.artefactId || !body.decisions) {
      throw new BadRequestException('artefactId and decisions are required');
    }

    this.logger.info(
      'POST .../change-proposals/recompute-conflicts - Recomputing conflicts',
      {
        organizationId,
        spaceId,
        artefactId: body.artefactId,
        decisionsCount: Object.keys(body.decisions).length,
      },
    );

    try {
      const result = await this.changeProposalsService.recomputeConflicts({
        userId: request.user.userId,
        organizationId,
        spaceId,
        artefactId: body.artefactId,
        decisions: body.decisions,
      });

      this.logger.info(
        'POST .../change-proposals/recompute-conflicts - Conflicts recomputed successfully',
        {
          organizationId,
          spaceId,
          artefactId: body.artefactId,
          conflictsCount: Object.keys(result.conflicts).length,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST .../change-proposals/recompute-conflicts - Failed to recompute conflicts',
        {
          organizationId,
          spaceId,
          artefactId: body.artefactId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Preview how artifacts render for a coding agent, returned as a zip file
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/preview-rendering
   */
  @Post('preview-rendering')
  async previewArtifactRendering(
    @Body() body: PreviewArtifactRenderingCommand,
    @Res() response: Response,
  ): Promise<void> {
    if (!body.codingAgent) {
      throw new BadRequestException('codingAgent is required');
    }

    this.logger.info(
      'POST .../change-proposals/preview-rendering - Previewing artifact rendering',
      {
        codingAgent: body.codingAgent,
        recipesCount: body.recipeVersions?.length ?? 0,
        standardsCount: body.standardVersions?.length ?? 0,
        skillsCount: body.skillVersions?.length ?? 0,
      },
    );

    const result =
      await this.changeProposalsService.previewArtifactRendering(body);

    response
      .setHeader('Content-Type', 'application/zip')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${result.fileName}"`,
      )
      .send(Buffer.from(result.fileContent, 'base64'));
  }
}
