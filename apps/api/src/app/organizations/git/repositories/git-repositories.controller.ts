import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  Query,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { GitRepositoriesService } from './git-repositories.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  CheckDirectoryExistenceResult,
  GitProviderId,
  GitRepo,
  GitRepoAlreadyExistsError,
  GitRepoId,
  OrganizationId,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';

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

const origin = 'OrganizationGitRepositoriesController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class GitRepositoriesController {
  constructor(
    private readonly gitRepositoriesService: GitRepositoriesService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationGitRepositoriesController initialized');
  }

  @Post()
  async addGitRepo(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Body() addGitRepoDto: AddGitRepoDto,
  ): Promise<GitRepo> {
    this.logger.info(
      'POST /organizations/:orgId/git/repositories - Adding git repository',
      {
        organizationId,
        gitProviderId: addGitRepoDto.gitProviderId,
        owner: addGitRepoDto.owner,
        repo: addGitRepoDto.repo,
        branch: addGitRepoDto.branch,
      },
    );

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
      if (error instanceof GitRepoAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Get()
  async getOrganizationRepositories(
    @Param('orgId') organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    this.logger.info(
      'GET /organizations/:orgId/git/repositories - Fetching organization repositories',
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
        'GET /organizations/:orgId/git/repositories - Failed to fetch organization repositories',
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
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Param('id') repositoryId: GitRepoId,
    @Query('path') path?: string,
  ): Promise<string[]> {
    const userId = req.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/git/repositories/:id/available-remote-directories - Getting available remote directories',
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
        'GET /organizations/:orgId/git/repositories/:id/available-remote-directories - Failed to get available remote directories',
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
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') repositoryId: GitRepoId,
  ): Promise<GitRepo | null> {
    this.logger.info(
      'GET /organizations/:orgId/git/repositories/:id - Fetching repository by ID',
      {
        organizationId,
        repositoryId,
      },
    );

    try {
      return await this.gitRepositoriesService.getRepositoryById(repositoryId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/git/repositories/:id - Failed to fetch repository',
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
    @Param('orgId') organizationId: OrganizationId,
    @Param('providerId') gitProviderId: GitProviderId,
  ): Promise<GitRepo[]> {
    this.logger.info(
      'GET /organizations/:orgId/git/repositories/provider/:providerId - Fetching repositories by provider',
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
        'GET /organizations/:orgId/git/repositories/provider/:providerId - Failed to fetch repositories by provider',
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
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Param('id') repositoryId: GitRepoId,
    @Body() checkDirectoryDto: CheckDirectoryExistenceDto,
  ): Promise<CheckDirectoryExistenceResult> {
    const userId = req.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/git/repositories/:id/check-directory-existence - Checking directory existence',
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
        'POST /organizations/:orgId/git/repositories/:id/check-directory-existence - Failed to check directory existence',
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
