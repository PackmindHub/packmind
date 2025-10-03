import { RecipeVersion } from '@packmind/recipes';
import { GitRepo, GitHexa } from '@packmind/git';
import { StandardsHexa, StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../../../domain/entities/FileUpdates';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { PackmindLogger, Target } from '@packmind/shared';
import { GenericRecipeSectionWriter } from './GenericRecipeSectionWriter';
import { GenericStandardSectionWriter } from './GenericStandardSectionWriter';
import { getTargetPrefixedPath } from '../utils/FileUtils';

export interface DeployerConfig {
  filePath: string;
  agentName: string;
  pathToPackmindFolder?: string;
}

export abstract class SingleFileDeployer implements ICodingAgentDeployer {
  protected readonly logger: PackmindLogger;
  protected abstract readonly config: DeployerConfig;

  constructor(
    protected readonly standardsHexa?: StandardsHexa,
    protected readonly gitHexa?: GitHexa,
  ) {
    this.logger = new PackmindLogger(this.constructor.name);
  }

  private formatMarkdownLink(
    item: {
      name: string;
      summary?: string | null;
      description?: string | null;
    },
    filePath: string,
  ): string {
    const link = `* [${item.name}](${filePath})`;

    const summary = item.summary?.trim();
    const description = item.description?.trim();

    // No text available, return just the link
    if (!summary && !description) {
      return link;
    }

    // If summary exists, use it as-is (no truncation)
    if (summary) {
      return `${link}: ${summary}`;
    }

    // At this point, we know description exists (checked above)
    // Fall back to description: extract first line and truncate if needed
    const firstLine = description!.split('\n')[0].trim();
    const truncated =
      firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine;

    return `${link}: ${truncated}`;
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info(`Deploying recipes for ${this.config.agentName}`, {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const existingContent = await this.getExistingContent(gitRepo, target);

    const updatedContent = GenericRecipeSectionWriter.replace({
      agentName: this.config.agentName,
      repoName: `${gitRepo.owner}/${gitRepo.repo}`,
      currentContent: existingContent,
      commentMarker: 'Packmind recipes',
      target: target.path,
      recipesSection: recipeVersions
        .map((recipeVersion) =>
          this.formatMarkdownLink(
            recipeVersion,
            `${this.config.pathToPackmindFolder ?? ''}.packmind/recipes/${recipeVersion.slug}.md`,
          ),
        )
        .join('\n'),
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    if (updatedContent !== existingContent) {
      const targetPrefixedPath = getTargetPrefixedPath(
        this.config.filePath,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: updatedContent,
      });
    }

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info(`Deploying standards for ${this.config.agentName}`, {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const existingContent = await this.getExistingContent(gitRepo, target);

    const updatedContent = GenericStandardSectionWriter.replace({
      currentContent: existingContent,
      commentMarker: 'Packmind standards',
      standardsSection: standardVersions
        .map((standardVersion) =>
          this.formatMarkdownLink(
            standardVersion,
            `${this.config.pathToPackmindFolder ?? ''}.packmind/standards/${standardVersion.slug}.md`,
          ),
        )
        .join('\n'),
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    if (updatedContent !== existingContent) {
      const targetPrefixedPath = getTargetPrefixedPath(
        this.config.filePath,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: updatedContent,
      });
    }

    return fileUpdates;
  }

  private async getExistingContent(
    gitRepo: GitRepo,
    target: Target,
  ): Promise<string> {
    if (!this.gitHexa) {
      this.logger.debug('No GitHexa available, returning empty content');
      return '';
    }

    try {
      const targetPrefixedPath = getTargetPrefixedPath(
        this.config.filePath,
        target,
      );
      const existingFile = await this.gitHexa.getFileFromRepo(
        gitRepo,
        targetPrefixedPath,
      );
      return existingFile?.content || '';
    } catch (error) {
      this.logger.debug(
        `Failed to get existing ${this.config.agentName} content`,
        {
          error: error instanceof Error ? error.message : String(error),
          targetPath: target.path,
        },
      );
      return '';
    }
  }
}
