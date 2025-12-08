import { PackmindLogger } from '@packmind/logger';
import {
  FileUpdates,
  GitRepo,
  RecipeVersion,
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
    },
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
    },
    codingAgents: CodingAgent[],
    existingFiles: Map<string, string>,
  ): Promise<FileUpdates> {
    this.logger.info('Rendering artifacts (recipes + standards)', {
      recipesCount: installed.recipeVersions.length,
      standardsCount: installed.standardVersions.length,
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
      codingAgents,
      existingFiles,
    );

    this.logger.info('Artifacts rendered successfully', {
      filesCount: result.createOrUpdate.length + result.delete.length,
    });

    return result;
  }
}
