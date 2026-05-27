import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { Public } from '@packmind/node-utils';
import { GitAdapter, GitHubWebhookSignatureVerifier } from '@packmind/git';
import { IGitPort } from '@packmind/types';
import { InjectGitAdapter } from '../../shared/HexaInjection';
import { RecipesService } from '../../organizations/spaces/recipes/recipes.service';
import { createOrganizationId } from '@packmind/types';
import type { Request } from 'express';

const origin = 'GitHubAppWebhookController';

type GitHubPushPayload = {
  installation?: { id: number };
  repository?: { full_name: string };
  ref?: string;
};

@Public()
@Controller('hooks')
export class GitHubAppWebhookController {
  private readonly verifier: GitHubWebhookSignatureVerifier;

  constructor(
    @InjectGitAdapter() private readonly gitAdapter: IGitPort,
    private readonly recipesService: RecipesService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.verifier = new GitHubWebhookSignatureVerifier();
    this.logger.info('GitHubAppWebhookController initialized');
  }

  @Post('github-app')
  @HttpCode(HttpStatus.NO_CONTENT)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signatureHeader: string | undefined,
    @Headers('x-github-event') eventHeader: string | undefined,
  ): Promise<void> {
    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.warn('POST /hooks/github-app - Missing raw body');
      throw new UnauthorizedException('Missing request body');
    }

    const adapter = this.gitAdapter as unknown as GitAdapter;
    const config = await adapter.getGitHubAppConfig();

    if (!config) {
      this.logger.warn(
        'POST /hooks/github-app - No GitHub App config found, rejecting webhook',
      );
      throw new UnauthorizedException('GitHub App not configured');
    }

    const isValid = this.verifier.verify(
      rawBody,
      signatureHeader,
      config.webhookSecret,
    );

    if (!isValid) {
      const maskedSig = signatureHeader
        ? `${signatureHeader.slice(0, 6)}*`
        : 'missing';
      this.logger.warn(
        'POST /hooks/github-app - Invalid webhook signature, rejecting',
        { signature: maskedSig },
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = eventHeader;

    if (event === 'installation' || event === 'installation_repositories') {
      this.logger.info(
        'POST /hooks/github-app - Installation event, ignoring',
        {
          event,
        },
      );
      return;
    }

    if (event === 'push') {
      await this.handlePushEvent(req.body as GitHubPushPayload);
      return;
    }

    this.logger.debug('POST /hooks/github-app - Unhandled event, ignoring', {
      event,
    });
  }

  private async handlePushEvent(payload: GitHubPushPayload): Promise<void> {
    const installationId = payload.installation?.id;

    if (!installationId) {
      this.logger.warn(
        'POST /hooks/github-app - Push event missing installation id',
      );
      return;
    }

    const adapter = this.gitAdapter as unknown as GitAdapter;
    const gitProvider =
      await adapter.getGitProviderByInstallationId(installationId);

    if (!gitProvider) {
      this.logger.info(
        'POST /hooks/github-app - No git provider for installation, skipping',
        { installationId },
      );
      return;
    }

    this.logger.info('POST /hooks/github-app - Dispatching push event', {
      installationId,
      providerId: gitProvider.id,
    });

    await this.recipesService.updateRecipesFromGitHub(
      payload,
      createOrganizationId(String(gitProvider.organizationId)),
    );
  }
}
