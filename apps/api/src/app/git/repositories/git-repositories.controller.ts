import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  Query,
  ConflictException,
} from '@nestjs/common';
import { GitRepositoriesService } from './git-repositories.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  CheckDirectoryExistenceResult,
  GitRepoAlreadyExistsError,
} from '@packmind/types';
import { GitRepo, GitProviderId, GitRepoId } from '@packmind/git';
import { AuthenticatedRequest } from '@packmind/node-utils';

interface AddGitRepoDto {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
}

interface CheckDirectoryExistenceDto {
  directoryPath: string;
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
      // Handle the main business case: repository already exists
      if (error instanceof GitRepoAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      // Let other errors bubble up (they're already logged in the use case)
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

  @Get(':id/available-remote-directories')
  async getAvailableRemoteDirectories(
    @Request() req: AuthenticatedRequest,
    @Param('id') repositoryId: GitRepoId,
    @Query('path') path?: string,
  ): Promise<string[]> {
    const organizationId = req.organization.id;
    const userId = req.user.userId;

    this.logger.info(
      'GET /git/repositories/:id/available-remote-directories - Getting available remote directories',
      {
        organizationId,
        repositoryId,
        userId,
        path: path || '/',
      },
    );

    try {
      return await this.gitRepositoriesService.getAvailableRemoteDirectories(
        userId,
        organizationId,
        repositoryId,
        path,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /git/repositories/:id/available-remote-directories - Failed to get available remote directories',
        {
          organizationId,
          repositoryId,
          userId,
          path: path || '/',
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

  @Post(':id/check-directory-existence')
  async checkDirectoryExistence(
    @Request() req: AuthenticatedRequest,
    @Param('id') repositoryId: GitRepoId,
    @Body() checkDirectoryDto: CheckDirectoryExistenceDto,
  ): Promise<CheckDirectoryExistenceResult> {
    const organizationId = req.organization.id;
    const userId = req.user.userId;

    this.logger.info(
      'POST /git/repositories/:id/check-directory-existence - Checking directory existence',
      {
        organizationId,
        userId,
        repositoryId,
        directoryPath: checkDirectoryDto.directoryPath,
        branch: checkDirectoryDto.branch,
      },
    );

    try {
      return await this.gitRepositoriesService.checkDirectoryExistence(
        userId,
        organizationId,
        repositoryId,
        checkDirectoryDto.directoryPath,
        checkDirectoryDto.branch,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /git/repositories/:id/check-directory-existence - Failed to check directory existence',
        {
          organizationId,
          userId,
          repositoryId,
          directoryPath: checkDirectoryDto.directoryPath,
          branch: checkDirectoryDto.branch,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
