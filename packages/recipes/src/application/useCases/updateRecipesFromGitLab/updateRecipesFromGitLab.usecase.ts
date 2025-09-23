import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { GitHexa } from '@packmind/git';
import {
  LogLevel,
  IUpdateRecipesFromGitLabUseCase,
  UpdateRecipesFromGitLabCommand,
  UpdateRecipesFromGitLabResponse,
  IDeploymentPort,
} from '@packmind/shared';
import { createOrganizationId } from '@packmind/accounts';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import {
  BaseUpdateRecipesFromWebhookUsecase,
  CommonRepoData,
} from '../updateRecipesFromWebhook/BaseUpdateRecipesFromWebhook.usecase';

const origin = 'UpdateRecipesFromGitLabUsecase';

interface GitLabWebhookPayload {
  object_kind: string;
  event_name: string;
  project: {
    id: number;
    name: string;
    namespace: string;
    path_with_namespace: string;
  };
}

export class UpdateRecipesFromGitLabUsecase
  extends BaseUpdateRecipesFromWebhookUsecase
  implements IUpdateRecipesFromGitLabUseCase
{
  constructor(
    recipeService: RecipeService,
    recipeVersionService: RecipeVersionService,
    gitHexa: GitHexa,
    recipeSummaryService: RecipeSummaryService,
    deploymentPort?: IDeploymentPort,
  ) {
    super(
      recipeService,
      recipeVersionService,
      gitHexa,
      recipeSummaryService,
      origin,
      deploymentPort,
      LogLevel.INFO,
    );
  }

  public async execute(
    command: UpdateRecipesFromGitLabCommand,
  ): Promise<UpdateRecipesFromGitLabResponse> {
    const { payload, headers = {}, organizationId: orgIdString } = command;
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting updateRecipesFromGitLab process');

    try {
      // Check if this is a push event
      if (!this.isPushEvent(headers)) {
        const gitlabEvent = headers['x-gitlab-event'];
        this.logger.info('Skipping non-push event', { eventType: gitlabEvent });
        return [];
      }

      // Extract GitLab-specific repository info
      const repoData = this.extractRepoInfo(payload);
      if (!repoData) {
        this.logger.warn(
          'Could not extract GitLab repository info from webhook payload',
          { payload: JSON.stringify(payload).substring(0, 200) },
        );
        return [];
      }

      this.logger.debug('Extracted GitLab repository info from webhook', {
        owner: repoData.owner,
        name: repoData.name,
      });

      // Call common processing logic
      return this.processWebhookPayload(
        repoData,
        organizationId,
        this.getProviderName(),
        payload,
      );
    } catch (error) {
      this.logger.error('Failed to update recipes from GitLab', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected getProviderName(): string {
    return 'gitlab';
  }

  protected isPushEvent(headers: Record<string, string>): boolean {
    const gitlabEvent = headers['x-gitlab-event'];
    const isPushEvent = gitlabEvent === 'Push Hook';

    this.logger.debug('Checking if webhook is a GitLab push event', {
      eventType: gitlabEvent,
      isPushEvent,
    });

    return isPushEvent;
  }

  protected extractRepoInfo(payload: unknown): CommonRepoData | null {
    const webhookPayload = payload as GitLabWebhookPayload;
    const pathWithNamespace = webhookPayload?.project?.path_with_namespace;

    if (pathWithNamespace) {
      // GitLab path_with_namespace format: "group/subgroup/project" or "owner/repo"
      // We need to extract the owner (everything except the last part) and repo name (last part)
      const parts = pathWithNamespace.split('/');
      if (parts.length >= 2) {
        const repoPathName = parts.pop(); // Get the last part (URL-friendly project name)
        const ownerPath = parts.join('/'); // Join the remaining parts as the owner

        return {
          owner: ownerPath,
          name: repoPathName || '', // Use path-friendly name from path_with_namespace
        };
      }
    }

    // Fallback to namespace and project name
    const namespace = webhookPayload?.project?.namespace;
    const projectName = webhookPayload?.project?.name;
    if (namespace && projectName) {
      return {
        owner: namespace,
        name: projectName,
      };
    }

    return null;
  }
}
