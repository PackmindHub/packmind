import { Controller, Get, Post, Param, Body, Request } from '@nestjs/common';
import { GitRepositoriesService } from './git-repositories.service';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { GitRepo, GitProviderId, GitRepoId } from '@packmind/git';
import { AuthenticatedRequest } from '@packmind/shared-nest';

interface AddGitRepoDto {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
}

const origin = 'GitRepositoriesController';

@Controller('git/repositories')
export class GitRepositoriesController {
  constructor(
    private readonly gitRepositoriesService: GitRepositoriesService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('GitRepositoriesController initialized');
  }

  @Post()
  async addGitRepo(
    @Request() req: AuthenticatedRequest,
    @Body() addGitRepoDto: AddGitRepoDto,
  ): Promise<GitRepo> {
    const organizationId = req.organization.id;

    this.logger.info('POST /git/repositories - Adding git repository', {
      organizationId,
      gitProviderId: addGitRepoDto.gitProviderId,
      owner: addGitRepoDto.owner,
      repo: addGitRepoDto.repo,
      branch: addGitRepoDto.branch,
    });

    try {
      return await this.gitRepositoriesService.addRepositoryToProvider(
        req.user.userId,
        organizationId,
        addGitRepoDto.gitProviderId,
        addGitRepoDto.owner,
        addGitRepoDto.repo,
        addGitRepoDto.branch,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /git/repositories - Failed to add git repository',
        {
          organizationId,
          gitProviderId: addGitRepoDto.gitProviderId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get()
  async getOrganizationRepositories(
    @Request() req: AuthenticatedRequest,
  ): Promise<GitRepo[]> {
    const organizationId = req.organization.id;

    this.logger.info(
      'GET /git/repositories - Fetching organization repositories',
      {
        organizationId,
      },
    );

    try {
      return await this.gitRepositoriesService.getRepositoriesByOrganization(
        organizationId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /git/repositories - Failed to fetch organization repositories',
        {
          organizationId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get(':id')
  async getRepositoryById(
    @Request() req: AuthenticatedRequest,
    @Param('id') repositoryId: GitRepoId,
  ): Promise<GitRepo | null> {
    const organizationId = req.organization.id;

    this.logger.info('GET /git/repositories/:id - Fetching repository by ID', {
      organizationId,
      repositoryId,
    });

    try {
      return await this.gitRepositoriesService.getRepositoryById(repositoryId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /git/repositories/:id - Failed to fetch repository',
        {
          organizationId,
          repositoryId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('provider/:providerId')
  async listReposByProvider(
    @Request() req: AuthenticatedRequest,
    @Param('providerId') gitProviderId: GitProviderId,
  ): Promise<GitRepo[]> {
    const organizationId = req.organization.id;

    this.logger.info(
      'GET /git/repositories/provider/:providerId - Fetching repositories by provider',
      {
        organizationId,
        gitProviderId,
      },
    );

    try {
      return await this.gitRepositoriesService.getRepositoriesByProvider(
        gitProviderId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /git/repositories/provider/:providerId - Failed to fetch repositories by provider',
        {
          organizationId,
          gitProviderId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
