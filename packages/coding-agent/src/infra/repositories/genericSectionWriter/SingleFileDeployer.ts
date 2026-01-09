import { PackmindLogger } from '@packmind/logger';
import {
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
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
    this.logger.info(
      `Clearing recipes section for ${this.config.agentName} (single-file deployers no longer render recipes)`,
      {
        recipesCount: recipeVersions.length,
        gitRepoId: gitRepo.id,
        targetId: target.id,
        targetPath: target.path,
      },
    );

    const targetPrefixedPath = getTargetPrefixedPath(
      this.config.filePath,
      target,
    );

    return {
      createOrUpdate: [
        {
          path: targetPrefixedPath,
          sections: [{ key: 'Packmind recipes', content: '' }],
        },
      ],
      delete: [],
    };
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
      `Clearing recipes section for ${this.config.agentName} - single-file deployers no longer render recipes`,
      {
        recipesCount: recipeVersions.length,
      },
    );

    return {
      createOrUpdate: [
        {
          path: this.config.filePath,
          sections: [{ key: 'Packmind recipes', content: '' }],
        },
      ],
      delete: [],
    };
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

  async deploySkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gitRepo: GitRepo,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target: Target,
  ): Promise<FileUpdates> {
    // Skills not supported for single-file deployers yet
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForSkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    // Skills not supported for single-file deployers yet
    return { createOrUpdate: [], delete: [] };
  }

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    this.logger.info(
      `Deploying artifacts for ${this.config.agentName} - clearing recipes and deploying standards`,
      {
        recipesCount: recipeVersions.length,
        standardsCount: standardVersions.length,
      },
    );

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

    const sections: { key: string; content: string }[] = [
      { key: 'Packmind recipes', content: '' }, // Always clear recipes section
    ];

    if (standardsSectionContent) {
      sections.push({
        key: 'Packmind standards',
        content: standardsSectionContent,
      });
    }

    return {
      createOrUpdate: [
        {
          path: this.config.filePath,
          sections,
        },
      ],
      delete: [],
    };
  }

  async generateRemovalFileUpdates(
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    installed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
  ): Promise<FileUpdates> {
    this.logger.info(
      `Generating removal file updates for ${this.config.agentName} - clearing recipes and standards as needed`,
      {
        removedStandardsCount: removed.standardVersions.length,
        removedSkillsCount: removed.skillVersions.length,
        installedStandardsCount: installed.standardVersions.length,
        installedSkillsCount: installed.skillVersions.length,
      },
    );

    const wouldClearStandards =
      removed.standardVersions.length > 0 &&
      installed.standardVersions.length === 0;

    const sections: { key: string; content: string }[] = [
      { key: 'Packmind recipes', content: '' }, // Always clear recipes section
    ];

    // Only clear standards section if there are removed standards AND no remaining installed standards
    if (wouldClearStandards) {
      sections.push({ key: 'Packmind standards', content: '' });
    }

    return {
      createOrUpdate: [
        {
          path: this.config.filePath,
          sections,
        },
      ],
      delete: [],
    };
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
