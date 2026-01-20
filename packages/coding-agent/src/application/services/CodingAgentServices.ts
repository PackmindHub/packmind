import { PackmindLogger } from '@packmind/logger';
import {
  FileUpdates,
  GitRepo,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { CodingAgent } from '../../domain/CodingAgents';
import { DeployerService } from './DeployerService';

const origin = 'CodingAgentServices';

export class CodingAgentServices {
  constructor(
    private readonly deployerService: DeployerService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('CodingAgentServices initialized');
  }

  async prepareRecipesDeployment(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    targets: Target[],
    codingAgents: CodingAgent[],
  ): Promise<FileUpdates> {
    this.logger.info('Preparing recipes deployment', {
      recipesCount: recipeVersions.length,
      targetsCount: targets.length,
      agentsCount: codingAgents.length,
      gitRepoId: gitRepo.id,
    });

    if (recipeVersions.length === 0) {
      this.logger.warn('No recipes provided for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    if (targets.length === 0) {
      this.logger.warn('No targets specified for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    if (codingAgents.length === 0) {
      this.logger.warn('No coding agents specified for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    const result = await this.deployerService.aggregateRecipeDeployments(
      recipeVersions,
      gitRepo,
      targets,
      codingAgents,
    );

    this.logger.info('Recipes deployment prepared successfully', {
      filesCount: result.createOrUpdate.length + result.delete.length,
    });

    return result;
  }

  async prepareStandardsDeployment(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    targets: Target[],
    codingAgents: CodingAgent[],
  ): Promise<FileUpdates> {
    this.logger.info('Preparing standards deployment', {
      standardsCount: standardVersions.length,
      targetsCount: targets.length,
      agentsCount: codingAgents.length,
      gitRepoId: gitRepo.id,
    });

    if (standardVersions.length === 0) {
      this.logger.warn('No standards provided for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    if (targets.length === 0) {
      this.logger.warn('No targets specified for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    if (codingAgents.length === 0) {
      this.logger.warn('No coding agents specified for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    const result = await this.deployerService.aggregateStandardsDeployments(
      standardVersions,
      gitRepo,
      targets,
      codingAgents,
    );

    this.logger.info('Standards deployment prepared successfully', {
      filesCount: result.createOrUpdate.length + result.delete.length,
    });

    return result;
  }

  async renderArtifacts(
    installed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    codingAgents: CodingAgent[],
    existingFiles: Map<string, string>,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering artifacts (recipes + standards + skills)', {
      recipesCount: installed.recipeVersions.length,
      standardsCount: installed.standardVersions.length,
      skillsCount: installed.skillVersions.length,
      removedRecipesCount: removed.recipeVersions.length,
      removedStandardsCount: removed.standardVersions.length,
      removedSkillsCount: removed.skillVersions.length,
      agentsCount: codingAgents.length,
      existingFilesCount: existingFiles.size,
    });

    if (codingAgents.length === 0) {
      this.logger.warn('No coding agents specified for rendering');
      return { createOrUpdate: [], delete: [] };
    }

    const result = await this.deployerService.aggregateArtifactRendering(
      installed.recipeVersions,
      installed.standardVersions,
      installed.skillVersions,
      codingAgents,
      existingFiles,
    );

    // Process removed artifacts to generate file updates
    const hasRemovedArtifacts =
      removed.recipeVersions.length > 0 ||
      removed.standardVersions.length > 0 ||
      removed.skillVersions.length > 0;

    if (hasRemovedArtifacts) {
      this.logger.info('Processing removed artifacts', {
        removedRecipesCount: removed.recipeVersions.length,
        removedStandardsCount: removed.standardVersions.length,
        removedSkillsCount: removed.skillVersions.length,
      });

      for (const agent of codingAgents) {
        try {
          const deployer = this.deployerService.getDeployerForAgent(agent);
          const removalUpdates = await deployer.generateRemovalFileUpdates(
            removed,
            installed,
          );

          removalUpdates.createOrUpdate.forEach((file) =>
            result.createOrUpdate.push(file),
          );
          removalUpdates.delete.forEach((file) => result.delete.push(file));
        } catch (error) {
          this.logger.error('Failed to generate removal updates for agent', {
            agent,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }

      this.logger.info('Removed artifacts processed');
    }

    // Note: Skill directory deletions are handled by each deployer's
    // generateRemovalFileUpdates method (ClaudeDeployer, CopilotDeployer, etc.)

    this.logger.info('Artifacts rendered successfully', {
      filesCount: result.createOrUpdate.length + result.delete.length,
      createOrUpdateCount: result.createOrUpdate.length,
      deleteCount: result.delete.length,
    });

    return result;
  }
}
