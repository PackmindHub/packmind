import { PackmindLogger } from '@packmind/logger';
import {
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  RecipeVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
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
    protected readonly standardsPort?: IStandardsPort,
    protected readonly gitPort?: IGitPort,
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
      (await this.standardsPort?.getRulesByStandardId?.(
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

    const recipesListContent = recipeVersions
      .map((recipeVersion) =>
        this.formatMarkdownLink(
          recipeVersion,
          `${this.config.pathToPackmindFolder ?? ''}.packmind/recipes/${recipeVersion.slug}.md`,
        ),
      )
      .join('\n');

    const sectionContent = GenericRecipeSectionWriter.generateRecipesSection({
      recipesSection: recipesListContent,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    if (sectionContent) {
      const targetPrefixedPath = getTargetPrefixedPath(
        this.config.filePath,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        sections: [
          {
            key: 'Packmind recipes',
            content: sectionContent,
          },
        ],
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

    const standardsListContent = await Promise.all(
      standardVersions.map((standardVersion) =>
        this.formatStandardContent(
          standardVersion,
          `${this.config.pathToPackmindFolder ?? ''}.packmind/standards/${standardVersion.slug}.md`,
        ),
      ),
    );

    const sectionContent =
      GenericStandardSectionWriter.generateStandardsSection({
        standardsSection: standardsListContent.join('\n\n'),
      });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    if (sectionContent) {
      const targetPrefixedPath = getTargetPrefixedPath(
        this.config.filePath,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        sections: [
          {
            key: 'Packmind standards',
            content: sectionContent,
          },
        ],
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
      currentContent: '',
      commentMarker: 'Packmind recipes',
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

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info(
      `Deploying artifacts (recipes + standards) for ${this.config.agentName}`,
      {
        recipesCount: recipeVersions.length,
        standardsCount: standardVersions.length,
      },
    );

    const recipesListContent = recipeVersions
      .map((recipeVersion) =>
        this.formatMarkdownLink(
          recipeVersion,
          `${this.config.pathToPackmindFolder ?? ''}.packmind/recipes/${recipeVersion.slug}.md`,
        ),
      )
      .join('\n');

    const recipesSectionContent =
      GenericRecipeSectionWriter.generateRecipesSection({
        recipesSection: recipesListContent,
      });

    const standardsListContent = await Promise.all(
      standardVersions.map((standardVersion) =>
        this.formatStandardContent(
          standardVersion,
          `${this.config.pathToPackmindFolder ?? ''}.packmind/standards/${standardVersion.slug}.md`,
        ),
      ),
    );

    const standardsSectionContent =
      GenericStandardSectionWriter.generateStandardsSection({
        standardsSection: standardsListContent.join('\n\n'),
      });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    const sections: { key: string; content: string }[] = [];

    if (recipesSectionContent) {
      sections.push({
        key: 'Packmind recipes',
        content: recipesSectionContent,
      });
    }

    if (standardsSectionContent) {
      sections.push({
        key: 'Packmind standards',
        content: standardsSectionContent,
      });
    }

    if (sections.length > 0) {
      fileUpdates.createOrUpdate.push({
        path: this.config.filePath,
        sections,
      });
    }

    return fileUpdates;
  }

  async generateRemovalFileUpdates(
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
    },
    installed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
    },
  ): Promise<FileUpdates> {
    this.logger.info(
      `Generating removal file updates for ${this.config.agentName}`,
      {
        removedRecipesCount: removed.recipeVersions.length,
        removedStandardsCount: removed.standardVersions.length,
        installedRecipesCount: installed.recipeVersions.length,
        installedStandardsCount: installed.standardVersions.length,
      },
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // If no artifacts remain installed, delete the file entirely
    if (
      installed.recipeVersions.length === 0 &&
      installed.standardVersions.length === 0 &&
      (removed.recipeVersions.length > 0 || removed.standardVersions.length > 0)
    ) {
      fileUpdates.delete.push({ path: this.config.filePath });
      return fileUpdates;
    }

    const wouldClearRecipes =
      removed.recipeVersions.length > 0 &&
      installed.recipeVersions.length === 0;
    const wouldClearStandards =
      removed.standardVersions.length > 0 &&
      installed.standardVersions.length === 0;

    const sections: { key: string; content: string }[] = [];

    // Only clear recipes section if there are removed recipes AND no remaining installed recipes
    if (wouldClearRecipes) {
      sections.push({ key: 'Packmind recipes', content: '' });
    }

    // Only clear standards section if there are removed standards AND no remaining installed standards
    if (wouldClearStandards) {
      sections.push({ key: 'Packmind standards', content: '' });
    }

    if (sections.length > 0) {
      fileUpdates.createOrUpdate.push({
        path: this.config.filePath,
        sections,
      });
    }

    return fileUpdates;
  }

  private async getExistingContent(
    gitRepo: GitRepo,
    target: Target,
  ): Promise<string> {
    if (!this.gitPort) {
      this.logger.debug('No GitPort available, returning empty content');
      return '';
    }

    try {
      const targetPrefixedPath = getTargetPrefixedPath(
        this.config.filePath,
        target,
      );
      const existingFile = await this.gitPort.getFileFromRepo(
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
