import { PackmindLogger } from '@packmind/logger';
import {
  FileUpdates,
  GitRepo,
  IGitPort,
  IStandardsPort,
  CommandVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { generateSkillMdContent } from '../utils/SkillMdContentBuilder';
import {
  buildPluginManifest,
  PluginManifestInput,
} from './buildPluginManifest';

const origin = 'ClaudePluginDeployer';

const EMPTY_UPDATES: FileUpdates = { createOrUpdate: [], delete: [] };

/**
 * Returns the plugin-root prefix for paths emitted by this deployer.
 * - '/' or empty target.path => '' (no prefix)
 * - 'plugins/security' => 'plugins/security/'
 * - 'plugins/security/' => 'plugins/security/'
 */
function pluginRoot(target: Target): string {
  const path = target.path ?? '';
  if (path === '' || path === '/') return '';
  return path.endsWith('/') ? path : `${path}/`;
}

export class ClaudePluginDeployer implements ICodingAgentDeployer {
  /**
   * Skills are rendered under `<plugin-root>/skills/<slug>/`. The folder path is
   * relative to the plugin root and is used by the burn-and-rebuild strategy to
   * clean up stale skill files.
   */
  private static readonly SKILLS_FOLDER_PATH = 'skills/';

  private lastSkippedStandardsCount = 0;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    void this.standardsPort;
    void this.gitPort;
  }

  async deployCommands(
    recipeVersions: CommandVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering recipes for Claude plugin', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });
    const root = pluginRoot(target);
    return {
      createOrUpdate: recipeVersions.map((rv) => ({
        path: `${root}commands/${rv.slug}.md`,
        content: rv.content,
        artifactType: 'command' as const,
        artifactName: rv.name,
        artifactId: rv.recipeId as string,
      })),
      delete: [],
    };
  }

  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering skills for Claude plugin', {
      skillsCount: skillVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });
    const root = pluginRoot(target);
    const createOrUpdate: FileUpdates['createOrUpdate'] = [];
    for (const skillVersion of skillVersions) {
      const files: Array<{
        path: string;
        content: string;
        isBase64: boolean | undefined;
        skillFileId: string | undefined;
        skillFilePermissions: string | undefined;
      }> = [
        {
          path: 'SKILL.md',
          content: generateSkillMdContent(skillVersion),
          isBase64: undefined,
          skillFileId: undefined,
          skillFilePermissions: undefined,
        },
      ];

      if (skillVersion.files && skillVersion.files.length > 0) {
        for (const file of skillVersion.files) {
          if (file.path.toUpperCase() === 'SKILL.MD') {
            continue;
          }
          files.push({
            path: file.path,
            content: file.content,
            isBase64: file.isBase64,
            skillFileId: file.id as string,
            skillFilePermissions: file.permissions,
          });
        }
      }

      for (const file of files) {
        createOrUpdate.push({
          path: `${root}${ClaudePluginDeployer.SKILLS_FOLDER_PATH}${skillVersion.slug}/${file.path}`,
          content: file.content,
          isBase64: file.isBase64,
          artifactType: 'skill' as const,
          artifactName: skillVersion.name,
          artifactId: skillVersion.skillId as string,
          skillFileId: file.skillFileId,
          skillFilePermissions: file.skillFilePermissions,
        });
      }
    }
    return { createOrUpdate, delete: [] };
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.lastSkippedStandardsCount = standardVersions.length;
    this.logger.info('Standards skipped in Claude plugin rendering', {
      count: this.lastSkippedStandardsCount,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });
    return { createOrUpdate: [], delete: [] };
  }

  /**
   * Returns the number of standards skipped by the most recent
   * `deployStandards` invocation. Plugins do not support standards (Rule 3);
   * callers surface this count to users as a "skipped" notice.
   */
  getLastSkippedStandardsCount(): number {
    return this.lastSkippedStandardsCount;
  }

  /**
   * Emits the Claude plugin manifest at `<plugin-root>/.claude-plugin/plugin.json`.
   * This file is specific to the plugin rendering mode and lives outside the
   * shared `ICodingAgentDeployer` contract.
   */
  deployPluginManifest(
    input: PluginManifestInput,
    target: Target,
  ): FileUpdates {
    const root = pluginRoot(target);
    return {
      createOrUpdate: [
        {
          path: `${root}.claude-plugin/plugin.json`,
          content: buildPluginManifest(input),
          artifactName: input.name,
          artifactId: input.name,
        },
      ],
      delete: [],
    };
  }

  async generateFileUpdatesForCommands(
    recipeVersions: CommandVersion[],
  ): Promise<FileUpdates> {
    void recipeVersions;
    return EMPTY_UPDATES;
  }

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    void standardVersions;
    return EMPTY_UPDATES;
  }

  async generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    void skillVersions;
    return EMPTY_UPDATES;
  }

  async generateRemovalFileUpdates(): Promise<FileUpdates> {
    return EMPTY_UPDATES;
  }

  async generateAgentCleanupFileUpdates(): Promise<FileUpdates> {
    return EMPTY_UPDATES;
  }

  async deployArtifacts(
    recipeVersions: CommandVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    void recipeVersions;
    void standardVersions;
    void skillVersions;
    return EMPTY_UPDATES;
  }

  getSkillsFolderPath(): string {
    return ClaudePluginDeployer.SKILLS_FOLDER_PATH;
  }
}
