import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  ConflictException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { GitProvidersService } from './git-providers.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoAlreadyExistsError,
  GitRepoId,
  GitProviderHasRepositoriesError,
  ListProvidersResponse,
  OrganizationId,
} from '@packmind/types';
import { AuthService } from '../../../auth/auth.service';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';

interface AddRepositoryDto {
  owner: string;
  repo: string;
  branch: string;
}

const origin = 'OrganizationGitProvidersController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class GitProvidersController {
  constructor(
    private readonly gitProvidersService: GitProvidersService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationGitProvidersController initialized');
  }

  @Put()
  async addGitProvider(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Body() gitProvider: Omit<GitProvider, 'id'>,
  ): Promise<GitProvider> {
    const userId = req.user.userId;

    this.logger.info(
      'PUT /organizations/:orgId/git/providers - Adding git provider',
      {
        organizationId,
        providerSource: gitProvider.source,
      },
    );

    try {
      return await this.gitProvidersService.addGitProvider(
        userId,
        organizationId,
        gitProvider,
        req.clientSource,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PUT /organizations/:orgId/git/providers - Failed to add git provider',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get()
  async listProviders(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
  ): Promise<ListProvidersResponse> {
    const userId = req.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/git/providers - Fetching git providers',
      {
        organizationId,
        userId,
      },
    );

    try {
      return await this.gitProvidersService.listProviders({
        userId,
        organizationId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/git/providers - Failed to fetch git providers',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get(':id/available-repos')
  async listAvailableRepos(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') gitProviderId: GitProviderId,
  ): Promise<
    {
      name: string;
      owner: string;
      description?: string;
      private: boolean;
      defaultBranch: string;
      language?: string;
      stars: number;
    }[]
  > {
    this.logger.info(
      'GET /organizations/:orgId/git/providers/:id/available-repos - Fetching available repositories with write access',
      {
        organizationId,
        gitProviderId,
      },
    );

    try {
      const repositories =
        await this.gitProvidersService.listAvailableRepos(gitProviderId);

      this.logger.info(
        'GET /organizations/:orgId/git/providers/:id/available-repos - Successfully fetched available repositories',
        {
          organizationId,
          gitProviderId,
          repositoryCount: repositories.length,
        },
      );

      return repositories;
    } catch (error) {
      this.logger.error(
        'GET /organizations/:orgId/git/providers/:id/available-repos - Error fetching available repositories',
        {
          organizationId,
          gitProviderId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  @Get(':id/repos/:owner/:repo/branches/:branch/exists')
  async checkBranchExists(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') gitProviderId: GitProviderId,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('branch') branch: string,
  ): Promise<{ exists: boolean }> {
    this.logger.info(
      'GET /organizations/:orgId/git/providers/:id/repos/:owner/:repo/branches/:branch/exists - Checking if branch exists',
      {
        organizationId,
        gitProviderId,
        owner,
        repo,
        branch,
      },
    );

    try {
      const exists = await this.gitProvidersService.checkBranchExists(
        organizationId,
        gitProviderId,
        owner,
        repo,
        branch,
      );
      return { exists };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/git/providers/:id/repos/:owner/:repo/branches/:branch/exists - Failed to check if branch exists',
        {
          organizationId,
          gitProviderId,
          owner,
          repo,
          branch,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Put(':id')
  async updateGitProvider(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Param('id') gitProviderId: GitProviderId,
    @Body() gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider> {
    this.logger.info(
      'PUT /organizations/:orgId/git/providers/:id - Updating git provider',
      {
        organizationId,
        gitProviderId,
        providerSource: gitProvider.source,
      },
    );

    try {
      const updatedProvider = await this.gitProvidersService.updateGitProvider(
        gitProviderId,
        gitProvider,
        req.user.userId,
        organizationId,
      );
      this.logger.info(
        'PUT /organizations/:orgId/git/providers/:id - Git provider updated successfully',
        {
          organizationId,
          gitProviderId,
        },
      );
      return updatedProvider;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PUT /organizations/:orgId/git/providers/:id - Failed to update git provider',
        {
          organizationId,
          gitProviderId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete(':id')
  async deleteGitProvider(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Param('id') gitProviderId: GitProviderId,
  ): Promise<void> {
    this.logger.info(
      'DELETE /organizations/:orgId/git/providers/:id - Deleting git provider',
      {
        organizationId,
        gitProviderId,
      },
    );

    try {
      await this.gitProvidersService.deleteGitProvider(
        gitProviderId,
        req.user.userId,
        organizationId,
      );
      this.logger.info(
        'DELETE /organizations/:orgId/git/providers/:id - Git provider deleted successfully',
        {
          organizationId,
          gitProviderId,
        },
      );
    } catch (error) {
      if (error instanceof GitProviderHasRepositoriesError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Post(':id/repositories')
  async addRepositoryToProvider(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Param('id') gitProviderId: GitProviderId,
    @Body() addRepositoryDto: AddRepositoryDto,
  ): Promise<GitRepo> {
    this.logger.info(
      'POST /organizations/:orgId/git/providers/:id/repositories - Adding repository to provider',
      {
        organizationId,
        gitProviderId,
        owner: addRepositoryDto.owner,
        repo: addRepositoryDto.repo,
        branch: addRepositoryDto.branch,
      },
    );

    try {
      return await this.gitProvidersService.addRepositoryToProvider(
        req.user.userId,
        organizationId,
        gitProviderId,
        addRepositoryDto.owner,
        addRepositoryDto.repo,
        addRepositoryDto.branch,
        req.clientSource,
      );
    } catch (error) {
      if (error instanceof GitRepoAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Delete(':providerId/repositories/:repositoryId')
  async removeRepositoryFromProvider(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Param('providerId') providerId: GitProviderId,
    @Param('repositoryId') repositoryId: GitRepoId,
  ): Promise<void> {
    this.logger.info(
      'DELETE /organizations/:orgId/git/providers/:providerId/repositories/:repositoryId - Removing repository from provider',
      {
        organizationId,
        providerId,
        repositoryId,
      },
    );

    try {
      await this.gitProvidersService.removeRepositoryFromProvider(
        providerId,
        req.user.userId,
        organizationId,
        repositoryId,
      );
      this.logger.info(
        'DELETE /organizations/:orgId/git/providers/:providerId/repositories/:repositoryId - Repository removed successfully',
        {
          organizationId,
          providerId,
          repositoryId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/git/providers/:providerId/repositories/:repositoryId - Failed to remove repository from provider',
        {
          organizationId,
          providerId,
          repositoryId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
