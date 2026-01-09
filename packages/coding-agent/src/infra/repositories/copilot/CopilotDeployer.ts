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
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { getTargetPrefixedPath } from '../utils/FileUtils';

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

    // Generate individual skill files for each skill version
    for (const skillVersion of skillVersions) {
      const skillFile = this.generateCopilotSkillFile(skillVersion);
      const targetPrefixedPath = getTargetPrefixedPath(skillFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: skillFile.content,
      });
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

    // Generate individual skill files for each skill version
    for (const skillVersion of skillVersions) {
      const skillFile = this.generateCopilotSkillFile(skillVersion);
      fileUpdates.createOrUpdate.push({
        path: skillFile.path,
        content: skillFile.content,
      });
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

    // Generate individual skill files for each skill version
    for (const skillVersion of skillVersions) {
      const skillFile = this.generateCopilotSkillFile(skillVersion);
      fileUpdates.createOrUpdate.push({
        path: skillFile.path,
        content: skillFile.content,
      });
    }

    // Clean up legacy recipes-index.instructions.md file
    fileUpdates.delete.push({
      path: CopilotDeployer.RECIPES_INDEX_PATH,
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
      });
    }

    // Delete individual Copilot configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `.github/instructions/packmind-${standardVersion.slug}.instructions.md`,
      });
    }

    // Delete individual skill files for removed skills
    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `.github/skills/${skillVersion.slug}/SKILL.md`,
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

    // Build frontmatter according to Agent Skills specification
    const frontmatterFields: string[] = [];

    if (skillVersion.name) {
      frontmatterFields.push(`name: ${skillVersion.name}`);
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
    const content = `${frontmatter}

${skillVersion.prompt}`;

    // Path: .github/skills/{skill-slug}/SKILL.md (folder structure with SKILL.md file)
    const path = `.github/skills/${skillVersion.slug}/SKILL.md`;

    return {
      path,
      content,
    };
  }

  /**
   * Escape single quotes in YAML values to prevent parsing errors
   */
  private escapeSingleQuotes(value: string): string {
    return value.replace(/'/g, "''");
  }
}
