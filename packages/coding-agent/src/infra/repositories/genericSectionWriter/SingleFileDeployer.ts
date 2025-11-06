import { RecipeVersion } from '@packmind/recipes';
import { GitRepo, GitHexa } from '@packmind/git';
import { StandardsHexa, StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../../../domain/entities/FileUpdates';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { PackmindLogger } from '@packmind/logger';
import { Target } from '@packmind/shared';
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
    const summaryOrDescription =
      GenericStandardSectionWriter.extractSummaryOrDescription(item);

    if (!summaryOrDescription) {
      return link;
    }

    return `${link}: ${summaryOrDescription}`;
  }

  private async formatStandardContent(
    standardVersion: StandardVersion,
    filePath: string,
  ): Promise<string> {
    const rules =
      standardVersion.rules ??
      (await this.standardsHexa?.getRulesByStandardId?.(
        standardVersion.standardId,
      )) ??
      [];

    return GenericStandardSectionWriter.formatStandardContent({
      standardVersion,
      rules,
      link: filePath,
    });
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

    const standardsSection = await Promise.all(
      standardVersions.map((standardVersion) =>
        this.formatStandardContent(
          standardVersion,
          `${this.config.pathToPackmindFolder ?? ''}.packmind/standards/${standardVersion.slug}.md`,
        ),
      ),
    );

    const updatedContent = GenericStandardSectionWriter.replace({
      currentContent: existingContent,
      commentMarker: 'Packmind standards',
      standardsSection: standardsSection.join('\n\n'),
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

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    this.logger.info(
      `Generating file updates for recipes (${this.config.agentName})`,
      {
        recipesCount: recipeVersions.length,
      },
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate content without fetching existing content or using target prefixing
    const updatedContent = GenericRecipeSectionWriter.replace({
      agentName: this.config.agentName,
      repoName: 'repository',
      currentContent: '',
      commentMarker: 'Packmind recipes',
      target: '/',
      recipesSection: recipeVersions
        .map((recipeVersion) =>
          this.formatMarkdownLink(
            recipeVersion,
            `${this.config.pathToPackmindFolder ?? ''}.packmind/recipes/${recipeVersion.slug}.md`,
          ),
        )
        .join('\n'),
    });

    fileUpdates.createOrUpdate.push({
      path: this.config.filePath,
      content: updatedContent,
    });

    return fileUpdates;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info(
      `Generating file updates for standards (${this.config.agentName})`,
      {
        standardsCount: standardVersions.length,
      },
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate content without fetching existing content or using target prefixing
    const standardsSection = await Promise.all(
      standardVersions.map((standardVersion) =>
        this.formatStandardContent(
          standardVersion,
          `${this.config.pathToPackmindFolder ?? ''}.packmind/standards/${standardVersion.slug}.md`,
        ),
      ),
    );

    const updatedContent = GenericStandardSectionWriter.replace({
      currentContent: '',
      commentMarker: 'Packmind standards',
      standardsSection: standardsSection.join('\n\n'),
    });

    fileUpdates.createOrUpdate.push({
      path: this.config.filePath,
      content: updatedContent,
    });

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
