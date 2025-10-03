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
} from '@nestjs/common';
import { GitProvidersService } from './git-providers.service';
import {
  LogLevel,
  PackmindLogger,
  GitRepoAlreadyExistsError,
  GitProviderHasRepositoriesError,
} from '@packmind/shared';
import { GitProvider, GitRepo, GitProviderId, GitRepoId } from '@packmind/git';
import { AuthService } from '../../auth/auth.service';
import { AuthenticatedRequest } from '@packmind/shared-nest';

interface AddRepositoryDto {
  owner: string;
  repo: string;
  branch: string;
}

const origin = 'GitProvidersController';

@Controller('git/providers')
export class GitProvidersController {
  constructor(
    private readonly gitProvidersService: GitProvidersService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('GitProvidersController initialized');
  }

  @Put()
  async addGitProvider(
    @Request() req: AuthenticatedRequest,
    @Body() gitProvider: Omit<GitProvider, 'id'>,
  ): Promise<GitProvider> {
    const organizationId = req.organization.id;
    const userId = req.user.userId;

    this.logger.info('POST /git/providers - Adding git provider', {
      organizationId,
      providerSource: gitProvider.source,
    });

    try {
      return await this.gitProvidersService.addGitProvider(
        userId,
        organizationId,
        gitProvider,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('POST /git/providers - Failed to add git provider', {
        organizationId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get()
  async listProviders(
    @Request() req: AuthenticatedRequest,
  ): Promise<Omit<GitProvider, 'token'>[]> {
    const organizationId = req.organization.id;

    this.logger.info('GET /git/providers - Fetching git providers', {
      organizationId,
    });

    try {
      const providers =
        await this.gitProvidersService.listProviders(organizationId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return providers.map(({ token, ...provider }) => provider);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /git/providers - Failed to fetch git providers', {
        organizationId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get(':id/available-repos')
  async listAvailableRepos(
    @Request() req: AuthenticatedRequest,
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
    const organizationId = req.organization.id;

    this.logger.info(
      'GET /git/providers/:id/available-repos - Fetching available repositories with write access',
      {
        organizationId,
        gitProviderId,
      },
    );

    try {
      const repositories =
        await this.gitProvidersService.listAvailableRepos(gitProviderId);

      this.logger.info(
        'GET /git/providers/:id/available-repos - Successfully fetched available repositories',
        {
          organizationId,
          gitProviderId,
          repositoryCount: repositories.length,
        },
      );

      return repositories;
    } catch (error) {
      this.logger.error(
        'GET /git/providers/:id/available-repos - Error fetching available repositories',
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
    @Request() req: AuthenticatedRequest,
    @Param('id') gitProviderId: GitProviderId,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('branch') branch: string,
  ): Promise<{ exists: boolean }> {
    const organizationId = req.organization.id;

    this.logger.info(
      'GET /git/providers/:id/repos/:owner/:repo/branches/:branch/exists - Checking if branch exists',
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
        'GET /git/providers/:id/repos/:owner/:repo/branches/:branch/exists - Failed to check if branch exists',
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
    @Request() req: AuthenticatedRequest,
    @Param('id') gitProviderId: GitProviderId,
    @Body() gitProvider: Partial<Omit<GitProvider, 'id'>>,
  ): Promise<GitProvider> {
    const organizationId = req.organization.id;

    this.logger.info('PUT /git/providers/:id - Updating git provider', {
      organizationId,
      gitProviderId,
      providerSource: gitProvider.source,
    });

    try {
      const updatedProvider = await this.gitProvidersService.updateGitProvider(
        gitProviderId,
        gitProvider,
        req.user.userId,
        organizationId,
      );
      this.logger.info(
        'PUT /git/providers/:id - Git provider updated successfully',
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
        'PUT /git/providers/:id - Failed to update git provider',
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
    @Request() req: AuthenticatedRequest,
    @Param('id') gitProviderId: GitProviderId,
  ): Promise<void> {
    const organizationId = req.organization.id;

    this.logger.info('DELETE /git/providers/:id - Deleting git provider', {
      organizationId,
      gitProviderId,
    });

    try {
      await this.gitProvidersService.deleteGitProvider(
        gitProviderId,
        req.user.userId,
        organizationId,
      );
      this.logger.info(
        'DELETE /git/providers/:id - Git provider deleted successfully',
        {
          organizationId,
          gitProviderId,
        },
      );
    } catch (error) {
      // Handle the business case: provider has associated repositories
      if (error instanceof GitProviderHasRepositoriesError) {
        throw new BadRequestException(error.message);
      }

      // Let other errors bubble up (they're already logged in the use case)
      throw error;
    }
  }

  @Post(':id/repositories')
  async addRepositoryToProvider(
    @Request() req: AuthenticatedRequest,
    @Param('id') gitProviderId: GitProviderId,
    @Body() addRepositoryDto: AddRepositoryDto,
  ): Promise<GitRepo> {
    const organizationId = req.organization.id;

    this.logger.info(
      'POST /git/providers/:id/repositories - Adding repository to provider',
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
      );
    } catch (error) {
      // Handle the main business case: repository already exists
      if (error instanceof GitRepoAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      // Let other errors bubble up (they're already logged in the use case)
      throw error;
    }
  }

  @Delete(':providerId/repositories/:repositoryId')
  async removeRepositoryFromProvider(
    @Request() req: AuthenticatedRequest,
    @Param('providerId') providerId: GitProviderId,
    @Param('repositoryId') repositoryId: GitRepoId,
  ): Promise<void> {
    const organizationId = req.organization.id;

    this.logger.info(
      'DELETE /git/providers/:providerId/repositories/:repositoryId - Removing repository from provider',
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
        'DELETE /git/providers/:providerId/repositories/:repositoryId - Repository removed successfully',
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
        'DELETE /git/providers/:providerId/repositories/:repositoryId - Failed to remove repository from provider',
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
