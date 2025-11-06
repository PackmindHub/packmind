import { RecipeService } from '../../services/RecipeService';
import { GitHexa } from '@packmind/git';
import { LogLevel } from '@packmind/logger';
import {
  IUpdateRecipesFromGitHubUseCase,
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitHubResponse,
  IDeploymentPort,
} from '@packmind/shared';
import { createOrganizationId } from '@packmind/accounts';
import {
  BaseUpdateRecipesFromWebhookUsecase,
  CommonRepoData,
} from '../updateRecipesFromWebhook/BaseUpdateRecipesFromWebhook.usecase';

const origin = 'UpdateRecipesFromGitHubUsecase';

interface GitHubWebhookPayload {
  repository?: {
    name?: string;
    owner?: {
      name?: string;
      login?: string;
    };
  };
}

export class UpdateRecipesFromGitHubUsecase
  extends BaseUpdateRecipesFromWebhookUsecase
  implements IUpdateRecipesFromGitHubUseCase
{
  constructor(
    recipeService: RecipeService,
    gitHexa: GitHexa,
    deploymentPort?: IDeploymentPort,
  ) {
    super(recipeService, gitHexa, origin, deploymentPort, LogLevel.INFO);
  }

  public async execute(
    command: UpdateRecipesFromGitHubCommand,
  ): Promise<UpdateRecipesFromGitHubResponse> {
    const { payload, headers = {}, organizationId: orgIdString } = command;
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting updateRecipesFromGitHub process');

    try {
      // Check if this is a push event
      if (!this.isPushEvent(headers)) {
        const githubEvent = headers['x-github-event'];
        this.logger.info('Skipping non-push event', { eventType: githubEvent });
        return [];
      }

      // Extract GitHub-specific repository info
      const repoData = this.extractRepoInfo(payload);
      if (!repoData) {
        this.logger.warn(
          'Could not extract GitHub repository info from webhook payload',
        );
        return [];
      }

      // Call common processing logic
      return this.processWebhookPayload(
        repoData,
        organizationId,
        this.getProviderName(),
        payload,
      );
    } catch (error) {
      this.logger.error('Failed to update recipes from GitHub', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected getProviderName(): string {
    return 'github';
  }

  protected isPushEvent(headers: Record<string, string>): boolean {
    const githubEvent = headers['x-github-event'];
    const isPushEvent = githubEvent === 'push';

    this.logger.debug('Checking if webhook is a GitHub push event', {
      eventType: githubEvent,
      isPushEvent,
    });

    return isPushEvent;
  }

  protected extractRepoInfo(payload: unknown): CommonRepoData | null {
    const webhookPayload = payload as GitHubWebhookPayload;
    const repoOwner =
      webhookPayload?.repository?.owner?.name ||
      webhookPayload?.repository?.owner?.login;
    const repoName = webhookPayload?.repository?.name;

    if (!repoOwner || !repoName) {
      return null;
    }

    return {
      owner: repoOwner,
      name: repoName,
    };
  }
}
