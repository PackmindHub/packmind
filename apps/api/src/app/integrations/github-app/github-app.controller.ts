import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  BuildGitHubAppManifestResponse,
  GetGitHubAppStatusResponse,
  GitProviderId,
  IGitPort,
  LinkGitHubAppInstallationResponse,
  ListInstallationRepositoriesResponse,
  RegisterGitHubAppFromManifestResponse,
  UnlinkGitHubAppInstallationResponse,
  createGitProviderId,
} from '@packmind/types';
import { InjectGitAdapter } from '../../shared/HexaInjection';
import { InstallCallbackDto, ManifestCallbackDto } from './github-app.dto';

const origin = 'GitHubAppController';

@Controller('integrations/github-app')
export class GitHubAppController {
  constructor(
    @InjectGitAdapter() private readonly gitAdapter: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('GitHubAppController initialized');
  }

  @Get('manifest')
  async buildManifest(
    @Request() req: AuthenticatedRequest,
  ): Promise<BuildGitHubAppManifestResponse> {
    this.logger.info('GET /integrations/github-app/manifest');
    return this.gitAdapter.buildGitHubAppManifest({
      userId: String(req.user.userId),
      organizationId: String(req.organization.id),
    });
  }

  @Post('manifest-callback')
  @HttpCode(200)
  async registerFromManifest(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ManifestCallbackDto,
  ): Promise<RegisterGitHubAppFromManifestResponse> {
    this.logger.info('POST /integrations/github-app/manifest-callback');
    return this.gitAdapter.registerGitHubAppFromManifest({
      userId: String(req.user.userId),
      organizationId: String(req.organization.id),
      code: dto.code,
      state: dto.state,
    });
  }

  @Get('status')
  async getStatus(
    @Request() req: AuthenticatedRequest,
  ): Promise<GetGitHubAppStatusResponse> {
    this.logger.info('GET /integrations/github-app/status');
    return this.gitAdapter.getGitHubAppStatus({
      userId: String(req.user.userId),
      organizationId: String(req.organization.id),
    });
  }

  @Post('install-callback')
  @HttpCode(200)
  async linkInstallation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InstallCallbackDto,
  ): Promise<LinkGitHubAppInstallationResponse> {
    this.logger.info('POST /integrations/github-app/install-callback');
    return this.gitAdapter.linkGitHubAppInstallation({
      userId: String(req.user.userId),
      organizationId: String(req.organization.id),
      installationId: dto.installationId,
    });
  }

  @Delete('installations/me')
  @HttpCode(200)
  async unlinkInstallation(
    @Request() req: AuthenticatedRequest,
  ): Promise<UnlinkGitHubAppInstallationResponse> {
    this.logger.info('DELETE /integrations/github-app/installations/me');
    return this.gitAdapter.unlinkGitHubAppInstallation({
      userId: String(req.user.userId),
      organizationId: String(req.organization.id),
    });
  }

  @Get('providers/:gitProviderId/repositories')
  async listRepositories(
    @Request() req: AuthenticatedRequest,
    @Param('gitProviderId') gitProviderId: GitProviderId,
  ): Promise<ListInstallationRepositoriesResponse> {
    this.logger.info(
      'GET /integrations/github-app/providers/:gitProviderId/repositories',
      { gitProviderId },
    );
    return this.gitAdapter.listInstallationRepositories({
      userId: String(req.user.userId),
      organizationId: String(req.organization.id),
      gitProviderId: createGitProviderId(gitProviderId),
    });
  }
}
