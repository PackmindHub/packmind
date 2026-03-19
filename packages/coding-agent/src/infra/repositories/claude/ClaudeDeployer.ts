import { PackmindLogger } from '@packmind/logger';
import {
  CODING_AGENT_ARTEFACT_PATHS,
  DeleteItem,
  DeleteItemType,
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  RecipeVersion,
  SkillFileOutput,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { escapeSingleQuotes, getTargetPrefixedPath } from '../utils/FileUtils';
import { DefaultSkillsDeployer } from '../defaultSkillsDeployer/DefaultSkillsDeployer';
import { sortAdditionalPropertiesKeys } from '@packmind/node-utils';

const origin = 'ClaudeDeployer';

export class ClaudeDeployer implements ICodingAgentDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.claude;
  /** Packmind-managed subdirectory within the broader standard path */
  private static readonly STANDARD_DEPLOY_DIR =
    CODING_AGENT_ARTEFACT_PATHS.claude.standard + 'packmind/';
  /** @deprecated Legacy path to clean up during migration */
  private static readonly LEGACY_COMMANDS_FOLDER_PATH =
    '.claude/commands/packmind/';
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
      ClaudeDeployer.ARTEFACT_PATHS.skill,
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
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Clean up legacy packmind commands subdirectory
    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
        target,
      ),
      type: DeleteItemType.Directory,
    });

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
description: '${escapeSingleQuotes(description)}'
---`;

    const content = `${frontmatter}

${recipeVersion.content}`;

    const path = `${ClaudeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;

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
        artifactId: standardVersion.standardId as string,
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
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Clean up legacy packmind commands subdirectory
    fileUpdates.delete.push({
      path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
      type: DeleteItemType.Directory,
    });

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
        artifactId: standardVersion.standardId as string,
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
          artifactId: skillVersion.skillId as string,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
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
          artifactId: skillVersion.skillId as string,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
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
        artifactId: recipeVersion.recipeId as string,
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
        artifactId: standardVersion.standardId as string,
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
          artifactId: skillVersion.skillId as string,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }

    // Clean up legacy packmind commands subdirectory
    fileUpdates.delete.push({
      path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
      type: DeleteItemType.Directory,
    });

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
        path: `${ClaudeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Clean up legacy packmind commands subdirectory when recipes are removed
    const hasRemovedRecipes = removed.recipeVersions.length > 0;
    if (hasRemovedRecipes) {
      fileUpdates.delete.push({
        path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      });
    }

    // Delete individual Claude configuration files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.STANDARD_DEPLOY_DIR}standard-${standardVersion.slug}.md`,
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
        path: ClaudeDeployer.STANDARD_DEPLOY_DIR,
        type: DeleteItemType.Directory,
      });
    }

    // Delete skill directories for removed skills
    // (git port will expand directory paths to individual files)
    for (const skillVersion of removed.skillVersions) {
      fileUpdates.delete.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
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
        path: ClaudeDeployer.LEGACY_COMMANDS_FOLDER_PATH,
        type: DeleteItemType.Directory,
      },
      {
        path: ClaudeDeployer.STANDARD_DEPLOY_DIR,
        type: DeleteItemType.Directory,
      },
    ];

    // Delete individual command files for recipes
    for (const recipeVersion of artifacts.recipeVersions) {
      deleteItems.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete default skills (managed by Packmind)
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      deleteItems.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${slug}`,
        type: DeleteItemType.Directory,
      });
    }

    // Delete user package skills (managed by Packmind)
    for (const skillVersion of artifacts.skillVersions) {
      deleteItems.push({
        path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}`,
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
   * Format paths value for YAML frontmatter.
   * Parses comma-separated paths and formats them as a YAML block sequence.
   * All paths are double-quoted for consistency.
   * Note: Commas inside braces are not treated as separators (e.g., a pattern with braces is a single path).
   */
  private formatPathsValue(scope: string): string {
    // Parse comma-separated paths, but don't split on commas inside braces {}
    const paths: string[] = [];
    let currentPath = '';
    let braceDepth = 0;

    for (let i = 0; i < scope.length; i++) {
      const char = scope[i];

      if (char === '{') {
        braceDepth++;
        currentPath += char;
      } else if (char === '}') {
        braceDepth--;
        currentPath += char;
      } else if (char === ',' && braceDepth === 0) {
        // Only split on commas that are not inside braces
        const trimmed = currentPath.trim();
        if (trimmed) {
          paths.push(trimmed);
        }
        currentPath = '';
      } else {
        currentPath += char;
      }
    }

    // Add the last path
    const trimmed = currentPath.trim();
    if (trimmed) {
      paths.push(trimmed);
    }

    // Format as YAML block sequence with double-quoted values
    return paths.map((p) => `\n  - "${p}"`).join('');
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
name: '${escapeSingleQuotes(standardVersion.name)}'
paths:${this.formatPathsValue(standardVersion.scope)}
alwaysApply: false
description: '${escapeSingleQuotes(summary)}'
---`;
    } else {
      // When the scope is empty
      frontmatter = `---
name: '${escapeSingleQuotes(standardVersion.name)}'
alwaysApply: true
description: '${escapeSingleQuotes(summary)}'
---`;
    }

    const content = `${frontmatter}

${instructionContent}`;

    const path = `${ClaudeDeployer.STANDARD_DEPLOY_DIR}standard-${standardVersion.slug}.md`;

    return {
      path,
      content,
    };
  }

  private generateClaudeSkillFiles(
    skillVersion: SkillVersion,
  ): SkillFileOutput[] {
    const files: SkillFileOutput[] = [];

    // Generate SKILL.md (main skill file)
    const skillMdContent = this.generateSkillMdContent(skillVersion);
    files.push({
      path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/SKILL.md`,
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
          path: `${ClaudeDeployer.ARTEFACT_PATHS.skill}${skillVersion.slug}/${file.path}`,
          content: file.content,
          isBase64: file.isBase64,
          skillFileId: file.id,
          skillFilePermissions: file.permissions,
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
        `name: '${escapeSingleQuotes(skillVersion.name)}'`,
      );
    }

    if (skillVersion.description) {
      frontmatterFields.push(
        `description: '${escapeSingleQuotes(skillVersion.description)}'`,
      );
    }

    if (skillVersion.license) {
      frontmatterFields.push(
        `license: '${escapeSingleQuotes(skillVersion.license)}'`,
      );
    }

    if (skillVersion.compatibility) {
      frontmatterFields.push(
        `compatibility: '${escapeSingleQuotes(skillVersion.compatibility)}'`,
      );
    }

    if (skillVersion.allowedTools) {
      frontmatterFields.push(
        `allowed-tools: '${escapeSingleQuotes(skillVersion.allowedTools)}'`,
      );
    }

    if (
      skillVersion.metadata &&
      Object.keys(skillVersion.metadata).length > 0
    ) {
      // Metadata is stored as JSONB, convert to YAML format
      const metadataYaml = Object.entries(skillVersion.metadata)
        .map(
          ([key, value]) => `  ${key}: '${escapeSingleQuotes(String(value))}'`,
        )
        .join('\n');
      frontmatterFields.push(`metadata:\n${metadataYaml}`);
    }

    // Emit Claude Code-specific additional properties
    if (
      skillVersion.additionalProperties &&
      Object.keys(skillVersion.additionalProperties).length > 0
    ) {
      for (const [camelKey, value] of sortAdditionalPropertiesKeys(
        skillVersion.additionalProperties,
      )) {
        const yamlKey = camelToKebab(camelKey);
        frontmatterFields.push(formatAdditionalPropertyYaml(yamlKey, value));
      }
    }

    const frontmatter = `---
${frontmatterFields.join('\n')}
---`;

    // Content is the skill prompt (body)
    return `${frontmatter}

${skillVersion.prompt}`;
  }

  getSkillsFolderPath(): string {
    return ClaudeDeployer.ARTEFACT_PATHS.skill;
  }
}

/**
 * Converts a camelCase string to kebab-case.
 * e.g. "disableModelInvocation" -> "disable-model-invocation"
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Formats an additional property value as YAML frontmatter.
 * Handles nested objects, arrays, and scalar values recursively.
 */
function formatAdditionalPropertyYaml(
  key: string,
  value: unknown,
  indent = 0,
): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          const entries = Object.entries(item as Record<string, unknown>).sort(
            ([a], [b]) => a.localeCompare(b),
          );
          if (entries.length === 0) return `${pad}- {}`;
          const [firstKey, firstVal] = entries[0];
          const firstLine = formatEntryValue(
            firstKey,
            firstVal,
            indent + 2,
            `${pad}- `,
          );
          const rest = entries
            .slice(1)
            .map(([k, v]) => formatEntryValue(k, v, indent + 2, `${pad}  `))
            .join('\n');
          return rest ? `${firstLine}\n${rest}` : firstLine;
        }
        return `${pad}- ${formatYamlScalar(item)}`;
      })
      .join('\n');
    return `${pad}${key}:\n${items}`;
  }
  if (value !== null && typeof value === 'object') {
    const nestedYaml = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => formatAdditionalPropertyYaml(k, v, indent + 2))
      .join('\n');
    return `${pad}${key}:\n${nestedYaml}`;
  }
  return `${pad}${key}: ${formatYamlScalar(value)}`;
}

function formatYamlScalar(value: unknown): string {
  if (typeof value === 'string') {
    return `'${escapeSingleQuotes(value)}'`;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  return `'${escapeSingleQuotes(String(value))}'`;
}

/**
 * Formats a key-value entry, recursing into complex values (objects/arrays)
 * instead of falling through to formatYamlScalar which would produce [object Object].
 */
function formatEntryValue(
  key: string,
  value: unknown,
  indent: number,
  prefix: string,
): string {
  if (value !== null && typeof value === 'object') {
    const nested = formatAdditionalPropertyYaml(key, value, indent);
    // Replace the leading whitespace with the provided prefix for the first line
    return `${prefix}${nested.trimStart()}`;
  }
  return `${prefix}${key}: ${formatYamlScalar(value)}`;
}
