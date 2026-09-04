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
import {
  buildPluginManifest,
  PluginManifestInput,
} from '../claudePlugin/buildPluginManifest';
import { generateSkillMdContent } from '../utils/SkillMdContentBuilder';

const origin = 'CopilotPluginDeployer';

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

export class CopilotPluginDeployer implements ICodingAgentDeployer {
  /**
   * Skills are rendered under `<plugin-root>/skills/<slug>/`. The folder path is
   * relative to the plugin root and is used by the burn-and-rebuild strategy to
   * clean up stale skill files.
   */
  private static readonly SKILLS_FOLDER_PATH = 'skills/';

  /**
   * Where Copilot CLI looks for a plugin manifest.
   *
   * Its loader probes `.plugin/`, `.github/plugin/` and `.claude-plugin/` — it
   * implements the same agent-plugins.org schema Claude Code does, so the Claude
   * path would work too. `.github/plugin/` is the sibling of the
   * `.github/plugin/marketplace.json` descriptor Packmind already writes for
   * this vendor, which makes the intent unambiguous to anyone reading the repo.
   */
  private static readonly MANIFEST_PATH = '.github/plugin/plugin.json';

  private lastSkippedStandardsCount = 0;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    void this.standardsPort;
    void this.gitPort;
  }

  /**
   * GitHub Copilot has a documented "prompt files" convention
   * (`.github/prompts/<name>.prompt.md`), unlike Claude Code's `commands/<slug>.md`.
   * Commands are rendered there instead.
   */
  async deployCommands(
    recipeVersions: CommandVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering recipes for Copilot plugin', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
      targetId: target.id,
      targetPath: target.path,
    });
    const root = pluginRoot(target);
    return {
      createOrUpdate: recipeVersions.map((rv) => ({
        path: `${root}.github/prompts/${rv.slug}.prompt.md`,
        content: rv.content,
        artifactType: 'command' as const,
        artifactName: rv.name,
        artifactId: rv.recipeId as string,
      })),
      delete: [],
    };
  }

  /**
   * GitHub Copilot has no first-party "skill" concept equivalent to Claude's
   * Agent Skills. Pending real product/design confirmation of Copilot's actual
   * skill-equivalent rendered output (the user story has no concrete example for
   * this yet), this method is a best-effort mirror of Claude's
   * `skills/<slug>/SKILL.md` (+ extra files) layout under the plugin root, and
   * should be revisited once that format is specified.
   */
  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering skills for Copilot plugin', {
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
          path: `${root}${CopilotPluginDeployer.SKILLS_FOLDER_PATH}${skillVersion.slug}/${file.path}`,
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
    this.logger.info('Standards skipped in Copilot plugin rendering', {
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
   * Emits the Copilot plugin manifest at `<plugin-root>/.github/plugin/plugin.json`.
   *
   * Copilot discovers a plugin's hooks through this file's `hooks` key, so
   * without a manifest an install-tracking hook has nowhere to be declared and
   * never runs. Like its Claude counterpart, this is specific to plugin
   * rendering and sits outside the shared `ICodingAgentDeployer` contract.
   */
  deployPluginManifest(
    input: PluginManifestInput,
    target: Target,
  ): FileUpdates {
    const root = pluginRoot(target);
    return {
      createOrUpdate: [
        {
          path: `${root}${CopilotPluginDeployer.MANIFEST_PATH}`,
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
    return CopilotPluginDeployer.SKILLS_FOLDER_PATH;
  }
}
