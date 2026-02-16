import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  BatchApplyChangeProposalsCommand,
  BatchApplyChangeProposalsResponse,
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  BatchRejectChangeProposalsCommand,
  BatchRejectChangeProposalsResponse,
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalId,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  ListChangeProposalsBySpaceResponse,
  ListCommandChangeProposalsResponse,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { ChangeProposalsService } from './change-proposals.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import {
  ChangeProposalConflictError,
  ChangeProposalNotFoundError,
  ChangeProposalNotPendingError,
  ChangeProposalPayloadMismatchError,
  UnsupportedChangeProposalTypeError,
} from '@packmind/playbook-change-management';

const origin = 'OrganizationsSpacesChangeProposalsController';

interface CreateChangeProposalBody {
  type: ChangeProposalType;
  artefactId: string;
  payload: unknown;
  captureMode: ChangeProposalCaptureMode;
}

interface BatchApplyChangeProposalBody {
  changeProposalId: ChangeProposalId;
  recipeId: RecipeId;
  force: boolean;
}

interface BatchRejectChangeProposalBody {
  changeProposalId: ChangeProposalId;
  recipeId: RecipeId;
}

/**
 * Controller for space-scoped change proposal routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/change-proposals (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesChangeProposalsController {
  constructor(
    private readonly changeProposalsService: ChangeProposalsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * Batch create change proposals
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch
   */
  @Post('batch')
  async batchCreateChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { proposals: CreateChangeProposalBody[] },
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
   * Batch apply change proposals
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch-apply
   */
  @Post('batch-apply')
  async batchApplyChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { proposals: BatchApplyChangeProposalBody[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<BatchApplyChangeProposalsResponse> {
    if (!body.proposals || body.proposals.length === 0) {
      throw new BadRequestException('Proposals array must not be empty');
    }

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch-apply - Batch applying change proposals',
      {
        organizationId,
        spaceId,
        count: body.proposals.length,
      },
    );

    const command: BatchApplyChangeProposalsCommand = {
      userId: request.user.userId,
      organizationId,
      spaceId,
      proposals: body.proposals,
    };

    const result =
      await this.changeProposalsService.batchApplyChangeProposals(command);

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch-apply - Batch apply completed',
      {
        organizationId,
        spaceId,
        applied: result.applied,
        errors: result.errors.length,
      },
    );

    return result;
  }

  /**
   * Batch reject change proposals
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch-reject
   */
  @Post('batch-reject')
  async batchRejectChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { proposals: BatchRejectChangeProposalBody[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<BatchRejectChangeProposalsResponse> {
    if (!body.proposals || body.proposals.length === 0) {
      throw new BadRequestException('Proposals array must not be empty');
    }

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch-reject - Batch rejecting change proposals',
      {
        organizationId,
        spaceId,
        count: body.proposals.length,
      },
    );

    const command: BatchRejectChangeProposalsCommand = {
      userId: request.user.userId,
      organizationId,
      spaceId,
      proposals: body.proposals,
    };

    const result =
      await this.changeProposalsService.batchRejectChangeProposals(command);

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/batch-reject - Batch reject completed',
      {
        organizationId,
        spaceId,
        rejected: result.rejected,
        errors: result.errors.length,
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
    @Body() body: CreateChangeProposalBody,
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
   * GET /organizations/:orgId/spaces/:spaceId/grouped-change-proposals
   */
  @Get('grouped-change-proposals')
  async listChangeProposalsBySpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListChangeProposalsBySpaceResponse> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/grouped-change-proposals - Listing grouped change proposals',
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
        'GET /organizations/:orgId/spaces/:spaceId/grouped-change-proposals - Grouped change proposals listed successfully',
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
   * List change proposals for a recipe
   * GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId
   */
  @Get(':recipeId')
  async listCommandChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('recipeId') recipeId: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListCommandChangeProposalsResponse> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId - Listing change proposals',
      {
        organizationId,
        spaceId,
        recipeId,
      },
    );

    try {
      const result =
        await this.changeProposalsService.listCommandChangeProposals({
          userId: request.user.userId,
          organizationId,
          spaceId,
          recipeId,
        });

      this.logger.info(
        'GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId - Change proposals listed successfully',
        {
          organizationId,
          spaceId,
          recipeId,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/change-proposals/:recipeId - Failed to list change proposals',
        {
          organizationId,
          spaceId,
          recipeId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Apply a change proposal
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/apply
   */
  @Post(':changeProposalId/apply')
  @HttpCode(HttpStatus.OK)
  async applyChangeProposal(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('changeProposalId') changeProposalId: ChangeProposalId,
    @Body() body: { recipeId: RecipeId; force?: boolean },
    @Req() request: AuthenticatedRequest,
  ): Promise<ChangeProposal> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/apply - Applying change proposal',
      {
        organizationId,
        spaceId,
        changeProposalId,
      },
    );

    try {
      const changeProposal =
        await this.changeProposalsService.applyChangeProposal({
          recipeId: body.recipeId,
          changeProposalId,
          organizationId,
          spaceId,
          userId,
          force: body.force ?? false,
        });

      this.logger.info(
        'POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/apply - Change proposal applied',
        {
          organizationId,
          spaceId,
          changeProposalId,
        },
      );

      return changeProposal;
    } catch (error) {
      if (error instanceof ChangeProposalNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ChangeProposalNotPendingError) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof ChangeProposalConflictError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * Reject a change proposal
   * POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/reject
   */
  @Post(':changeProposalId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectChangeProposal(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('changeProposalId') changeProposalId: ChangeProposalId,
    @Body() body: { recipeId: RecipeId },
    @Req() request: AuthenticatedRequest,
  ): Promise<ChangeProposal> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/reject - Rejecting change proposal',
      {
        organizationId,
        spaceId,
        changeProposalId,
      },
    );

    try {
      const changeProposal =
        await this.changeProposalsService.rejectChangeProposal({
          recipeId: body.recipeId,
          changeProposalId,
          organizationId,
          spaceId,
          userId,
        });

      this.logger.info(
        'POST /organizations/:orgId/spaces/:spaceId/change-proposals/:changeProposalId/reject - Change proposal rejected',
        {
          organizationId,
          spaceId,
          changeProposalId,
        },
      );

      return changeProposal;
    } catch (error) {
      if (error instanceof ChangeProposalNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ChangeProposalNotPendingError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
