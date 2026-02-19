import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  ApplyChangeProposalsResponse,
  ChangeProposalId,
  ListChangeProposalsByArtefactResponse,
  OrganizationId,
  SkillId,
  SpaceId,
} from '@packmind/types';
import { SkillsChangeProposalsService } from './skills-change-proposals.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';

const origin = 'OrganizationsSpacesSkillsChangeProposalsController';

/**
 * Controller for skill-scoped change proposal routes
 * Actual path: /organizations/:orgId/spaces/:spaceId/skills/:skillId/change-proposals (inherited via RouterModule in AppModule)
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesSkillsChangeProposalsController {
  constructor(
    private readonly service: SkillsChangeProposalsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * List change proposals for a skill
   * GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/change-proposals
   */
  @Get()
  async listChangeProposalsBySkill(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Req() request: AuthenticatedRequest,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/change-proposals',
      { organizationId, spaceId, skillId },
    );

    const result = await this.service.listChangeProposalsBySkill({
      userId: request.user.userId,
      organizationId,
      spaceId,
      artefactId: skillId,
    });

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/skills/:skillId/change-proposals - Listed successfully',
      {
        organizationId,
        spaceId,
        skillId,
        count: result.changeProposals.length,
      },
    );

    return result;
  }

  /**
   * Apply or reject change proposals for a skill
   * POST /organizations/:orgId/spaces/:spaceId/skills/:skillId/change-proposals/apply
   */
  @Post('apply')
  async applySkillChangeProposals(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('skillId') skillId: SkillId,
    @Body()
    body: { accepted: ChangeProposalId[]; rejected: ChangeProposalId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<ApplyChangeProposalsResponse<SkillId>> {
    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/skills/:skillId/change-proposals/apply',
      {
        organizationId,
        spaceId,
        skillId,
        acceptedCount: body.accepted.length,
        rejectedCount: body.rejected.length,
      },
    );

    const result = await this.service.applySkillChangeProposals({
      userId: request.user.userId,
      organizationId,
      spaceId,
      artefactId: skillId,
      accepted: body.accepted,
      rejected: body.rejected,
    });

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/skills/:skillId/change-proposals/apply - Applied successfully',
      {
        organizationId,
        spaceId,
        skillId,
        newVersion: result.newArtefactVersion,
      },
    );

    return result;
  }
}
