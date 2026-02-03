import {
  GitRepo,
  RecipeVersion,
  StandardVersion,
  SkillVersion,
  Target,
  FileUpdates,
} from '@packmind/types';

export interface ICodingAgentDeployer {
  deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  deploySkills(
    skillVersions: SkillVersion[],
    gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates>;
  generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates>;
  generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates>;
  generateFileUpdatesForSkills(
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates>;
  generateRemovalFileUpdates(
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
  ): Promise<FileUpdates>;
  deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions?: SkillVersion[],
  ): Promise<FileUpdates>;
  deployDefaultSkills?(options?: {
    cliVersion?: string;
    includeBeta?: boolean;
  }): Promise<FileUpdates> | FileUpdates;
  /**
   * Returns the base path for skills folder for this deployer.
   * Returns undefined if skills are not supported by this agent.
   * Used for "burn and rebuild" strategy to delete stale skill files.
   */
  getSkillsFolderPath(): string | undefined;
}
