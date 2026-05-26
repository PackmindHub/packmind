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

const origin = 'ClaudePluginDeployer';

const EMPTY_UPDATES: FileUpdates = { createOrUpdate: [], delete: [] };

export class ClaudePluginDeployer implements ICodingAgentDeployer {
  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    void this.standardsPort;
    void this.gitPort;
    void this.logger;
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    void recipeVersions;
    void gitRepo;
    void target;
    return EMPTY_UPDATES;
  }

  async deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    void skillVersions;
    void gitRepo;
    void target;
    return EMPTY_UPDATES;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    void standardVersions;
    void gitRepo;
    void target;
    return EMPTY_UPDATES;
  }

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
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
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    void recipeVersions;
    void standardVersions;
    void skillVersions;
    return EMPTY_UPDATES;
  }

  getSkillsFolderPath(): string | undefined {
    return undefined;
  }
}
