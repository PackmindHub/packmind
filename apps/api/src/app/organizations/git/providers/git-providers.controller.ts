import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  BadRequestException,
  NotImplementedException,
  UseGuards,
} from '@nestjs/common';
import { GitProvidersService } from './git-providers.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoId,
  ListAvailableReposResponse,
  ListProvidersResponse,
  OrganizationId,
} from '@packmind/types';
import { AuthService } from '../../../auth/auth.service';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { resolveGithubAppMode } from '../../../shared/utils/edition';
import { GitHubAppManifest } from './types/GitHubAppManifest';

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

    return await this.gitProvidersService.addGitProvider(
      userId,
      organizationId,
      gitProvider,
      req.clientSource,
    );
  }

  @Get('github/app/install-url')
  async getGithubAppInstallUrl(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Query('gitProviderId') gitProviderId?: GitProviderId,
    @Query('displayName') displayName?: string,
  ): Promise<{ installUrl: string; state: string }> {
    this.logger.info(
      'GET /organizations/:orgId/git/providers/github/app/install-url',
      {
        organizationId,
        hasGitProviderId: Boolean(gitProviderId),
        hasDisplayName: Boolean(displayName),
      },
    );

    return await this.gitProvidersService.buildGithubAppInstallUrl({
      organizationId,
      userId: req.user.userId,
      gitProviderId: gitProviderId || undefined,
      displayName: displayName || undefined,
    });
  }

  @Get('github/app/manifest')
  async getGithubAppManifest(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Query('githubOrg') githubOrg?: string,
    @Query('displayName') displayName?: string,
  ): Promise<{
    manifest: GitHubAppManifest;
    state: string;
    manifestPostUrl: string;
  }> {
    const mode = await resolveGithubAppMode();
    if (mode !== 'on-prem') {
      throw new NotImplementedException(
        'GitHub App manifest flow is not available when a shared GitHub App is configured',
      );
    }

    this.logger.info(
      'GET /organizations/:orgId/git/providers/github/app/manifest',
      {
        organizationId,
        hasGithubOrg: Boolean(githubOrg),
        hasDisplayName: Boolean(displayName),
      },
    );

    return await this.gitProvidersService.buildGithubAppManifest({
      orgId: organizationId,
      userId: req.user.userId,
      githubOrg: githubOrg?.trim() || undefined,
      displayName: displayName || undefined,
    });
  }

  @Post('github/app/manifest-callback')
  async completeGithubAppManifest(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Body() body: { code: string; state: string },
  ): Promise<{ installUrl: string }> {
    const mode = await resolveGithubAppMode();
    if (mode !== 'on-prem') {
      throw new NotImplementedException(
        'GitHub App manifest flow is not available when a shared GitHub App is configured',
      );
    }

    this.logger.info(
      'POST /organizations/:orgId/git/providers/github/app/manifest-callback',
      {
        organizationId,
        hasCode: Boolean(body?.code),
        hasState: Boolean(body?.state),
      },
    );

    if (
      !body ||
      typeof body.code !== 'string' ||
      body.code.length === 0 ||
      typeof body.state !== 'string' ||
      body.state.length === 0
    ) {
      throw new BadRequestException(
        'Request body must include code (string) and state (string)',
      );
    }

    return await this.gitProvidersService.completeGithubAppManifest({
      orgId: organizationId,
      userId: req.user.userId,
      code: body.code,
      state: body.state,
    });
  }

  @Get('github/app/status')
  async getGithubAppStatus(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
  ): Promise<{
    hasApp: boolean;
    appSlug?: string;
    revokedAt?: Date | null;
    linkedProviderCount: number;
  }> {
    this.logger.info(
      'GET /organizations/:orgId/git/providers/github/app/status',
      { organizationId },
    );

    return await this.gitProvidersService.getGithubAppStatus({
      orgId: organizationId,
      userId: req.user.userId,
    });
  }

  @Delete('github/app')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeGithubApp(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const mode = await resolveGithubAppMode();
    if (mode !== 'on-prem') {
      throw new NotImplementedException(
        'GitHub App revocation is not available when a shared GitHub App is configured',
      );
    }

    this.logger.info('DELETE /organizations/:orgId/git/providers/github/app', {
      organizationId,
    });

    await this.gitProvidersService.revokeGithubApp({
      orgId: organizationId,
      userId: req.user.userId,
    });
  }

  @Post('github/app/callback')
  async completeGithubAppInstall(
    @Param('orgId') organizationId: OrganizationId,
    @Request() req: AuthenticatedRequest,
    @Body() body: { installationId: number; state: string },
  ): Promise<GitProvider> {
    this.logger.info(
      'POST /organizations/:orgId/git/providers/github/app/callback',
      {
        organizationId,
        // Do NOT log the full state or installationId at info — installation
        // IDs aren't strictly PII but they correlate to org/user pairs.
        // Log only structural facts.
        hasState: Boolean(body?.state),
        hasInstallationId: Boolean(body?.installationId),
      },
    );

    if (
      !body ||
      typeof body.state !== 'string' ||
      body.state.length === 0 ||
      typeof body.installationId !== 'number'
    ) {
      throw new BadRequestException(
        'Request body must include state (string) and installationId (number)',
      );
    }

    return await this.gitProvidersService.completeGithubAppInstall({
      organizationId,
      userId: req.user.userId,
      installationId: body.installationId,
      state: body.state,
      source: req.clientSource,
    });
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

    return await this.gitProvidersService.listProviders({
      userId,
      organizationId,
    });
  }

  @Get(':id/available-repos')
  async listAvailableRepos(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') gitProviderId: GitProviderId,
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
  ): Promise<ListAvailableReposResponse> {
    const parsedPage = page ? Number(page) : undefined;
    this.logger.info(
      'GET /organizations/:orgId/git/providers/:id/available-repos - Fetching available repositories with write access',
      {
        organizationId,
        gitProviderId,
        page: parsedPage,
      },
    );

    const response = await this.gitProvidersService.listAvailableRepos({
      gitProviderId,
      organizationId,
      userId: req.user.userId,
      page:
        parsedPage !== undefined && Number.isFinite(parsedPage)
          ? parsedPage
          : undefined,
    });

    this.logger.info(
      'GET /organizations/:orgId/git/providers/:id/available-repos - Successfully fetched available repositories',
      {
        organizationId,
        gitProviderId,
        currentPage: response.currentPage,
        availablePages: response.availablePages,
        repositoryCount: response.repositories.length,
      },
    );

    return response;
  }

  @Get(':id/check-auth')
  async checkProviderAuth(
    @Param('orgId') organizationId: OrganizationId,
    @Param('id') gitProviderId: GitProviderId,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    this.logger.info(
      'GET /organizations/:orgId/git/providers/:id/check-auth - Probing provider auth',
      { organizationId, gitProviderId, userId },
    );

    return await this.gitProvidersService.checkProviderAuth(
      organizationId,
      gitProviderId,
      userId,
    );
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

    return this.gitProvidersService.addRepositoryToProvider(
      req.user.userId,
      organizationId,
      gitProviderId,
      addRepositoryDto.owner,
      addRepositoryDto.repo,
      addRepositoryDto.branch,
      req.clientSource,
    );
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
  }
}
