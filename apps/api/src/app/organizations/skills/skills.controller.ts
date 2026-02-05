import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  CodingAgent,
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  OrganizationId,
  validateAgentsWithWarnings,
} from '@packmind/types';
import { OrganizationSkillsService } from './skills.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationSkillsController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationSkillsController {
  constructor(
    private readonly skillsService: OrganizationSkillsService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationSkillsController initialized');
  }

  @Get('default')
  async getDefaultSkills(
    @Param('orgId') organizationId: OrganizationId,
    @Query('cliVersion') cliVersion: string | undefined,
    @Query('includeBeta') includeBetaParam: string | undefined,
    @Query('agent') agent: string | string[] | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<DeployDefaultSkillsResponse> {
    const includeBeta = includeBetaParam === 'true';

    // Normalize and validate agents to array of valid CodingAgents
    let agents: CodingAgent[] | undefined;
    if (agent) {
      const agentArray = Array.isArray(agent) ? agent : [agent];
      const { validAgents, invalidAgents } =
        validateAgentsWithWarnings(agentArray);
      if (invalidAgents.length > 0) {
        this.logger.info('Invalid agent values provided, ignoring', {
          invalidAgents,
          validAgents,
        });
      }
      if (validAgents && validAgents.length > 0) {
        agents = validAgents;
      }
    }

    this.logger.info(
      'GET /organizations/:orgId/skills/default - Fetching default skills',
      {
        organizationId,
        cliVersion,
        includeBeta,
        agents,
      },
    );

    try {
      const command: DeployDefaultSkillsCommand = {
        userId: request.user.userId,
        organizationId,
        source: request.clientSource,
        cliVersion,
        includeBeta,
        agents,
      };

      const result = await this.skillsService.deployDefaultSkills(command);

      this.logger.info(
        'GET /organizations/:orgId/skills/default - Default skills fetched successfully',
        {
          organizationId,
          createOrUpdateCount: result.fileUpdates.createOrUpdate.length,
          deleteCount: result.fileUpdates.delete.length,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/skills/default - Failed to fetch default skills',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
