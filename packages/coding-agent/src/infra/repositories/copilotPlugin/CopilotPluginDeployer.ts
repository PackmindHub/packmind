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

// A target path of '/' means the repository root, so it yields no prefix
// rather than a leading slash.
function pluginRoot(target: Target): string {
  const path = target.path ?? '';
  if (path === '' || path === '/') return '';
  return path.endsWith('/') ? path : `${path}/`;
}

export class CopilotPluginDeployer implements ICodingAgentDeployer {
  // Relative to the plugin root, not the repo root: the burn-and-rebuild
  // strategy in CodingAgentServices deletes this directory to clear stale
  // skill files.
  private static readonly SKILLS_FOLDER_PATH = 'skills/';

  /**
   * Where Copilot CLI looks for a plugin manifest. Its loader probes
   * `.plugin/`, `.github/plugin/` and `.claude-plugin/` — it implements the
   * same agent-plugins.org schema Claude Code does, so the Claude path would
   * work too. `.github/plugin/` is chosen because it is the sibling of the
   * `.github/plugin/marketplace.json` descriptor Packmind recognises for this
   * vendor (`MARKETPLACE_DESCRIPTOR_CANDIDATES`).
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
   * Copilot's plugin skill format is not settled, so this mirrors Claude's
   * `skills/<slug>/SKILL.md` (+ extra files) layout under the plugin root as a
   * placeholder. Revisit once Copilot specifies its own.
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
   * Plugins do not support standards (Rule 3), so `deployStandards` emits
   * nothing and records the count here; callers surface it to users as a
   * "skipped" notice.
   */
  getLastSkippedStandardsCount(): number {
    return this.lastSkippedStandardsCount;
  }

  /**
   * Copilot discovers a plugin's hooks through this manifest's `hooks` key, so
   * without the manifest an install-tracking hook has nowhere to be declared
   * and never runs. Specific to plugin rendering, hence outside the shared
   * `ICodingAgentDeployer` contract.
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
