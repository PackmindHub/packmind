import { PackmindLogger } from '@packmind/logger';
import {
  DeleteItemType,
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
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';

const origin = 'CopilotDeployer';

export class CopilotDeployer implements ICodingAgentDeployer {
  /** @deprecated Legacy path to clean up during migration */
  private static readonly RECIPES_INDEX_PATH =
    '.github/instructions/packmind-recipes-index.instructions.md';
  private readonly logger: PackmindLogger;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
  ) {
    this.logger = new PackmindLogger(origin);
  }

  async deployDefaultSkills() {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'CoPilot',
      '.github/skills/',
    );
    return defaultSkillsDeployer.deployDefaultSkills();
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for GitHub Copilot', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Copilot prompt files for each recipe
    for (const recipeVersion of recipeVersions) {
      const promptFile = this.generateCopilotPromptForRecipe(recipeVersion);
      const targetPrefixedPath = getTargetPrefixedPath(promptFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: promptFile.content,
      });
    }

    // Clean up legacy recipes-index.instructions.md file
    fileUpdates.delete.push({
      path: getTargetPrefixedPath(CopilotDeployer.RECIPES_INDEX_PATH, target),
      type: DeleteItemType.File,
    });

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for GitHub Copilot', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Copilot configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCopilotConfigForStandard(standardVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (GitHub Copilot)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Copilot prompt files for each recipe
    for (const recipeVersion of recipeVersions) {
      const promptFile = this.generateCopilotPromptForRecipe(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: promptFile.path,
        content: promptFile.content,
      });
    }

    // Clean up legacy recipes-index.instructions.md file
    fileUpdates.delete.push({
      path: CopilotDeployer.RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
    });

    return fileUpdates;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (GitHub Copilot)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Copilot configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCopilotConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    return fileUpdates;
  }

  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying skills for GitHub Copilot', {
      skillsCount: skillVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate skill files for each skill version
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCopilotSkillFiles(skillVersion);
      for (const skillFile of skillFiles) {
        const targetPrefixedPath = getTargetPrefixedPath(
          skillFile.path,
          target,
        );
        fileUpdates.createOrUpdate.push({
          path: targetPrefixedPath,
          content: skillFile.content,
          isBase64: skillFile.isBase64,
        });
      }
    }

    return fileUpdates;
  }

  async generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for skills (GitHub Copilot)', {
      skillsCount: skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate skill files for each skill version
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCopilotSkillFiles(skillVersion);
      for (const skillFile of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: skillFile.path,
          content: skillFile.content,
          isBase64: skillFile.isBase64,
        });
      }
    }

    return fileUpdates;
  }

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    this.logger.info(
      'Deploying artifacts (recipes + standards + skills) for GitHub Copilot',
      {
        recipesCount: recipeVersions.length,
        standardsCount: standardVersions.length,
        skillsCount: skillVersions.length,
      },
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Copilot prompt files for each recipe
    for (const recipeVersion of recipeVersions) {
      const promptFile = this.generateCopilotPromptForRecipe(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: promptFile.path,
        content: promptFile.content,
      });
    }

    // Generate individual Copilot configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateCopilotConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
      });
    }

    // Generate skill files for each skill version
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateCopilotSkillFiles(skillVersion);
      for (const skillFile of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: skillFile.path,
          content: skillFile.content,
          isBase64: skillFile.isBase64,
        });
      }
    }

    // Clean up legacy recipes-index.instructions.md file
    fileUpdates.delete.push({
      path: CopilotDeployer.RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
    });

    return fileUpdates;
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
    this.logger.info('Generating removal file updates for GitHub Copilot', {
      removedRecipesCount: removed.recipeVersions.length,
      removedStandardsCount: removed.standardVersions.length,
      removedSkillsCount: removed.skillVersions.length,
      installedRecipesCount: installed.recipeVersions.length,
      installedStandardsCount: installed.standardVersions.length,
      installedSkillsCount: installed.skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Delete individual Copilot prompt files for removed recipes
    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `.github/prompts/${recipeVersion.slug}.prompt.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete old index file (migration cleanup)
    // This ensures clean migration from index-based to prompt-based approach
    if (
      removed.recipeVersions.length > 0 ||
      installed.recipeVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: CopilotDeployer.RECIPES_INDEX_PATH,
        type: DeleteItemType.File,
      });
    }

    // Delete individual Copilot configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `.github/instructions/packmind-${standardVersion.slug}.instructions.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete skill directories for removed skills
    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `.github/skills/${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }

  /**
   * Generate GitHub Copilot configuration file for a specific standard
   */
  private async generateCopilotConfigForStandard(
    standardVersion: StandardVersion,
  ): Promise<{
    path: string;
    content: string;
  }> {
    this.logger.debug('Generating Copilot configuration for standard', {
      standardSlug: standardVersion.slug,
      scope: standardVersion.scope,
    });
    const rules =
      standardVersion.rules ??
      (await this.standardsPort?.getRulesByStandardId(
        standardVersion.standardId,
      )) ??
      [];

    const applyTo = standardVersion.scope || '**';

    const content = `---
applyTo: '${applyTo}'
---
${GenericStandardSectionWriter.formatStandardContent({
  standardVersion,
  rules,
  link: `../../.packmind/standards/${standardVersion.slug}.md`,
})}`;

    const path = `.github/instructions/packmind-${standardVersion.slug}.instructions.md`;

    return {
      path,
      content,
    };
  }

  /**
   * Generate GitHub Copilot prompt file for a specific recipe
   */
  private generateCopilotPromptForRecipe(recipeVersion: RecipeVersion): {
    path: string;
    content: string;
  } {
    this.logger.debug('Generating Copilot prompt for recipe', {
      recipeSlug: recipeVersion.slug,
      recipeName: recipeVersion.name,
    });

    // Use summary if available, otherwise fall back to name
    const description = recipeVersion.summary?.trim() || recipeVersion.name;

    // Generate frontmatter with YAML format
    const frontmatter = `---
description: '${this.escapeSingleQuotes(description)}'
agent: 'agent'
---`;

    // Content is the full recipe markdown
    const content = `${frontmatter}

${recipeVersion.content}`;

    const path = `.github/prompts/${recipeVersion.slug}.prompt.md`;

    return {
      path,
      content,
    };
  }

  /**
   * Generate GitHub Copilot skill files for a specific skill version
   * Skills are deployed to .github/skills/{skill-slug}/ following the Agent Skills specification
   * Returns an array of files including SKILL.md and any additional files
   */
  private generateCopilotSkillFiles(skillVersion: SkillVersion): Array<{
    path: string;
    content: string;
    isBase64?: boolean;
  }> {
    this.logger.debug('Generating Copilot skill files', {
      skillSlug: skillVersion.slug,
      skillName: skillVersion.name,
      fileCount: (skillVersion.files?.length ?? 0) + 1,
    });

    const files: Array<{ path: string; content: string; isBase64?: boolean }> =
      [];

    // Generate SKILL.md (main skill file)
    const skillMdContent = this.generateSkillMdContent(skillVersion);
    files.push({
      path: `.github/skills/${skillVersion.slug}/SKILL.md`,
      content: skillMdContent,
    });

    // Add additional skill files if they exist (excluding SKILL.md which we already generated)
    if (skillVersion.files && skillVersion.files.length > 0) {
      for (const file of skillVersion.files) {
        // Skip SKILL.md as it's already generated from the prompt
        if (file.path.toUpperCase() === 'SKILL.MD') {
          continue;
        }
        files.push({
          path: `.github/skills/${skillVersion.slug}/${file.path}`,
          content: file.content,
          isBase64: file.isBase64,
        });
      }
    }

    return files;
  }

  /**
   * Generate the SKILL.md content with frontmatter for a specific skill version
   */
  private generateSkillMdContent(skillVersion: SkillVersion): string {
    // Build frontmatter according to Agent Skills specification
    const frontmatterFields: string[] = [];

    if (skillVersion.name) {
      frontmatterFields.push(
        `name: '${this.escapeSingleQuotes(skillVersion.name)}'`,
      );
    }

    if (skillVersion.description) {
      frontmatterFields.push(
        `description: '${this.escapeSingleQuotes(skillVersion.description)}'`,
      );
    }

    if (skillVersion.license) {
      frontmatterFields.push(
        `license: '${this.escapeSingleQuotes(skillVersion.license)}'`,
      );
    }

    if (skillVersion.compatibility) {
      frontmatterFields.push(
        `compatibility: '${this.escapeSingleQuotes(skillVersion.compatibility)}'`,
      );
    }

    if (skillVersion.allowedTools) {
      frontmatterFields.push(
        `allowed-tools: '${this.escapeSingleQuotes(skillVersion.allowedTools)}'`,
      );
    }

    if (
      skillVersion.metadata &&
      Object.keys(skillVersion.metadata).length > 0
    ) {
      // Metadata is stored as JSONB, convert to YAML format
      const metadataYaml = Object.entries(skillVersion.metadata)
        .map(
          ([key, value]) =>
            `  ${key}: '${this.escapeSingleQuotes(String(value))}'`,
        )
        .join('\n');
      frontmatterFields.push(`metadata:\n${metadataYaml}`);
    }

    const frontmatter = `---
${frontmatterFields.join('\n')}
---`;

    // Content is the skill prompt (body)
    return `${frontmatter}

${skillVersion.prompt}`;
  }

  /**
   * @deprecated Use generateCopilotSkillFiles instead
   * Generate GitHub Copilot skill file for a specific skill version
   * Skills are deployed to .github/skills/{skill-slug}/SKILL.md following the Agent Skills specification
   */
  private generateCopilotSkillFile(skillVersion: SkillVersion): {
    path: string;
    content: string;
  } {
    this.logger.debug('Generating Copilot skill file', {
      skillSlug: skillVersion.slug,
      skillName: skillVersion.name,
    });

    const skillMdContent = this.generateSkillMdContent(skillVersion);
    const path = `.github/skills/${skillVersion.slug}/SKILL.md`;

    return {
      path,
      content: skillMdContent,
    };
  }

  /**
   * Escape single quotes in YAML values to prevent parsing errors
   */
  private escapeSingleQuotes(value: string): string {
    return value.replace(/'/g, "''");
  }
}
