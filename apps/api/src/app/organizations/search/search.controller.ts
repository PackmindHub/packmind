import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationId, SearchResponse, UserId } from '@packmind/types';
import { SearchService } from './search.service';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationsSearchController';

/**
 * Controller for organization-scoped global search.
 * Actual path: /organizations/:orgId/search (inherited via RouterModule in AppModule).
 *
 * OrganizationAccessGuard validates that the authenticated user has access to the
 * requested organization (compares request.params.orgId to request.organization.id).
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationsSearchController {
  private readonly logger = new PackmindLogger(origin, LogLevel.INFO);

  constructor(private readonly searchService: SearchService) {
    this.logger.info('OrganizationsSearchController initialized');
  }

  /**
   * GET /organizations/:orgId/search?q=<term>
   * Searches standards, commands (recipes), skills and packages across the
   * spaces the user belongs to. Requires at least 2 characters.
   */
  @Get()
  async search(
    @Param('orgId') organizationId: OrganizationId,
    @Query('q') query: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SearchResponse> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }

    const userId: UserId = request.user.userId;

    this.logger.info('GET /organizations/:orgId/search', {
      organizationId,
      userId: userId.substring(0, 6) + '*',
      queryLength: query.trim().length,
    });

    return this.searchService.search({
      organizationId,
      userId,
      query: query.trim(),
    });
  }
}
