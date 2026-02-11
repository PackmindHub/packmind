import { PackmindLogger } from '@packmind/logger';
import {
  DeleteItem,
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

const origin = 'ClaudeDeployer';

export class ClaudeDeployer implements ICodingAgentDeployer {
  private static readonly STANDARDS_FOLDER_PATH = '.claude/rules/packmind/';
  private static readonly COMMANDS_FOLDER_PATH = '.claude/commands/packmind/';
  private static readonly SKILLS_FOLDER_PATH = '.claude/skills/';
  private static readonly CLAUDE_MD_PATH = 'CLAUDE.md';

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async deployDefaultSkills(options?: {
    cliVersion?: string;
    includeBeta?: boolean;
  }) {
    const defaultSkillsDeployer = new DefaultSkillsDeployer(
      'Claude',
      '.claude/skills/',
    );
    return defaultSkillsDeployer.deployDefaultSkills(options);
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for Claude Code', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude command files for each recipe
    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForRecipe(recipeVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
      });
    }

    // Clear legacy Packmind recipes section from CLAUDE.md
    const claudeMdPath = getTargetPrefixedPath(
      ClaudeDeployer.CLAUDE_MD_PATH,
      target,
    );
    fileUpdates.createOrUpdate.push({
      path: claudeMdPath,
      sections: [{ key: 'Packmind recipes', content: '' }],
    });

    return fileUpdates;
  }

  /**
   * Generate Claude command file for a specific recipe
   */
  private generateClaudeConfigForRecipe(recipeVersion: RecipeVersion): {
    path: string;
    content: string;
  } {
    const description = recipeVersion.summary?.trim() || recipeVersion.name;

    const frontmatter = `---
description: ${description}
---`;

    const content = `${frontmatter}

${recipeVersion.content}`;

    const path = `${ClaudeDeployer.COMMANDS_FOLDER_PATH}${recipeVersion.slug}.md`;

    return {
      path,
      content,
    };
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for Claude Code', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
      const targetPrefixedPath = getTargetPrefixedPath(configFile.path, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    // Clear legacy Packmind standards section from CLAUDE.md
    const claudeMdPath = getTargetPrefixedPath(
      ClaudeDeployer.CLAUDE_MD_PATH,
      target,
    );
    fileUpdates.createOrUpdate.push({
      path: claudeMdPath,
      sections: [{ key: 'Packmind standards', content: '' }],
    });

    return fileUpdates;
  }

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (Claude Code)', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude command files for each recipe (without target prefix)
    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForRecipe(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
      });
    }

    // Clear legacy Packmind recipes section from CLAUDE.md
    fileUpdates.createOrUpdate.push({
      path: ClaudeDeployer.CLAUDE_MD_PATH,
      sections: [{ key: 'Packmind recipes', content: '' }],
    });

    return fileUpdates;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (Claude Code)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    // Clear legacy Packmind standards section from CLAUDE.md
    fileUpdates.createOrUpdate.push({
      path: ClaudeDeployer.CLAUDE_MD_PATH,
      sections: [{ key: 'Packmind standards', content: '' }],
    });

    return fileUpdates;
  }

  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying skills for Claude Code', {
      skillsCount: skillVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude skill files for each skill
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateClaudeSkillFiles(skillVersion);
      for (const file of skillFiles) {
        const targetPrefixedPath = getTargetPrefixedPath(file.path, target);
        fileUpdates.createOrUpdate.push({
          path: targetPrefixedPath,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
        });
      }
    }

    return fileUpdates;
  }

  async generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for skills (Claude Code)', {
      skillsCount: skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Generate individual Claude skill files for each skill (without target prefix)
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateClaudeSkillFiles(skillVersion);
      for (const file of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: file.path,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
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
      'Deploying artifacts (recipes + standards + skills) for Claude Code',
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

    // Generate individual Claude command files for each recipe
    for (const recipeVersion of recipeVersions) {
      const configFile = this.generateClaudeConfigForRecipe(recipeVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
      });
    }

    // Generate individual Claude configuration files for each standard
    for (const standardVersion of standardVersions) {
      const configFile =
        await this.generateClaudeConfigForStandard(standardVersion);
      fileUpdates.createOrUpdate.push({
        path: configFile.path,
        content: configFile.content,
        artifactType: 'standard',
        artifactName: standardVersion.name,
      });
    }

    // Generate individual Claude skill files for each skill
    for (const skillVersion of skillVersions) {
      const skillFiles = this.generateClaudeSkillFiles(skillVersion);
      for (const file of skillFiles) {
        fileUpdates.createOrUpdate.push({
          path: file.path,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill',
          artifactName: skillVersion.name,
        });
      }
    }

    // Clear legacy Packmind sections from CLAUDE.md
    fileUpdates.createOrUpdate.push({
      path: ClaudeDeployer.CLAUDE_MD_PATH,
      sections: [
        { key: 'Packmind standards', content: '' },
        { key: 'Packmind recipes', content: '' },
      ],
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
    this.logger.info('Generating removal file updates for Claude Code', {
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

    // Delete individual Claude command files for removed recipes
    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.COMMANDS_FOLDER_PATH}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete commands folder if all recipes are removed and something was actually removed
    const hasRemovedRecipes = removed.recipeVersions.length > 0;
    if (hasRemovedRecipes && installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: ClaudeDeployer.COMMANDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      });
    }

    // Delete individual Claude configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.STANDARDS_FOLDER_PATH}standard-${standardVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete rules folder if all artifacts are removed and something was actually removed
    const hasRemovedArtifacts =
      removed.recipeVersions.length > 0 || removed.standardVersions.length > 0;
    if (
      hasRemovedArtifacts &&
      installed.recipeVersions.length === 0 &&
      installed.standardVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: ClaudeDeployer.STANDARDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      });
    }

    // Delete skill directories for removed skills
    // (git port will expand directory paths to individual files)
    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `.claude/skills/${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }

  async generateAgentCleanupFileUpdates(artifacts: {
    recipeVersions: RecipeVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  }): Promise<FileUpdates> {
    this.logger.info('Generating agent cleanup file updates for Claude Code', {
      recipesCount: artifacts.recipeVersions.length,
      standardsCount: artifacts.standardVersions.length,
      skillsCount: artifacts.skillVersions.length,
    });

    const deleteItems: DeleteItem[] = [
      {
        path: ClaudeDeployer.COMMANDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      },
      {
        path: ClaudeDeployer.STANDARDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      },
    ];

    // Delete default skills (managed by Packmind)
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      deleteItems.push({
        path: `${ClaudeDeployer.SKILLS_FOLDER_PATH}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    // Delete user package skills (managed by Packmind)
    for (const skillVersion of artifacts.skillVersions) {
      deleteItems.push({
        path: `${ClaudeDeployer.SKILLS_FOLDER_PATH}${skillVersion.slug}`,
        type: DeleteItemType.Directory,
      });
    }

    return {
      createOrUpdate: [
        {
          path: ClaudeDeployer.CLAUDE_MD_PATH,
          sections: [
            { key: 'Packmind standards', content: '' },
            { key: 'Packmind recipes', content: '' },
          ],
        },
      ],
      delete: deleteItems,
    };
  }

  /**
   * Format globs value for YAML frontmatter.
   * Parses comma-separated globs and formats them as a YAML array.
   * Quotes individual globs that start with one or two asterisks/stars to prevent YAML syntax issues.
   * Note: Commas inside braces are not treated as separators (e.g., a pattern with braces is a single glob).
   */
  private formatGlobsValue(scope: string): string {
    // Parse comma-separated globs, but don't split on commas inside braces {}
    const globs: string[] = [];
    let currentGlob = '';
    let braceDepth = 0;

    for (let i = 0; i < scope.length; i++) {
      const char = scope[i];

      if (char === '{') {
        braceDepth++;
        currentGlob += char;
      } else if (char === '}') {
        braceDepth--;
        currentGlob += char;
      } else if (char === ',' && braceDepth === 0) {
        // Only split on commas that are not inside braces
        const trimmed = currentGlob.trim();
        if (trimmed) {
          globs.push(trimmed);
        }
        currentGlob = '';
      } else {
        currentGlob += char;
      }
    }

    // Add the last glob
    const trimmed = currentGlob.trim();
    if (trimmed) {
      globs.push(trimmed);
    }

    // If only one glob, check if it needs quoting
    if (globs.length === 1) {
      const glob = globs[0];
      if (glob.startsWith('**/') || glob.startsWith('*')) {
        return `"${glob}"`;
      }
      return glob;
    }

    // Multiple globs: format as YAML array
    const quotedGlobs = globs.map((glob) => {
      if (glob.startsWith('**/') || glob.startsWith('*')) {
        return `"${glob}"`;
      }
      return glob;
    });

    return `[${quotedGlobs.join(', ')}]`;
  }

  /**
   * Generate Claude configuration file for a specific standard
   */
  private async generateClaudeConfigForStandard(
    standardVersion: StandardVersion,
  ): Promise<{
    path: string;
    content: string;
  }> {
    const rules =
      standardVersion.rules ??
      (await this.standardsPort?.getRulesByStandardId(
        standardVersion.standardId,
      )) ??
      [];

    const instructionContent =
      GenericStandardSectionWriter.formatStandardContent({
        standardVersion,
        rules,
        link: `../../../.packmind/standards/${standardVersion.slug}.md`,
      });

    const summary = standardVersion.summary?.trim() || standardVersion.name;

    let frontmatter: string;

    if (standardVersion.scope && standardVersion.scope.trim() !== '') {
      // When the scope is not null or empty
      frontmatter = `---
name: ${standardVersion.name}
globs: ${this.formatGlobsValue(standardVersion.scope)}
alwaysApply: false
description: ${summary}
---`;
    } else {
      // When the scope is empty
      frontmatter = `---
name: ${standardVersion.name}
alwaysApply: true
description: ${summary}
---`;
    }

    const content = `${frontmatter}

${instructionContent}`;

    const path = `${ClaudeDeployer.STANDARDS_FOLDER_PATH}standard-${standardVersion.slug}.md`;

    return {
      path,
      content,
    };
  }

  private generateClaudeSkillFiles(skillVersion: SkillVersion): Array<{
    path: string;
    content: string;
    isBase64?: boolean;
  }> {
    const files: Array<{ path: string; content: string; isBase64?: boolean }> =
      [];

    // Generate SKILL.md (main skill file)
    const skillMdContent = this.generateSkillMdContent(skillVersion);
    files.push({
      path: `.claude/skills/${skillVersion.slug}/SKILL.md`,
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
          path: `.claude/skills/${skillVersion.slug}/${file.path}`,
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
   * Escape single quotes in YAML values to prevent parsing errors
   */
  private escapeSingleQuotes(value: string): string {
    return value.replace(/'/g, "''");
  }

  getSkillsFolderPath(): string {
    return ClaudeDeployer.SKILLS_FOLDER_PATH;
  }
}
