import { RecipeVersion } from '@packmind/recipes';
import { StandardVersion } from '@packmind/standards';
import { GitRepo } from '@packmind/git';
import { PackmindLogger } from '@packmind/shared';
import { FileUpdates } from '../../domain/entities/FileUpdates';
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
    codingAgents: CodingAgent[],
  ): Promise<FileUpdates> {
    this.logger.info('Preparing recipes deployment', {
      recipesCount: recipeVersions.length,
      agentsCount: codingAgents.length,
      gitRepoId: gitRepo.id,
    });

    if (recipeVersions.length === 0) {
      this.logger.warn('No recipes provided for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    if (codingAgents.length === 0) {
      this.logger.warn('No coding agents specified for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    const result = await this.deployerService.aggregateRecipeDeployments(
      recipeVersions,
      gitRepo,
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
    codingAgents: CodingAgent[],
  ): Promise<FileUpdates> {
    this.logger.info('Preparing standards deployment', {
      standardsCount: standardVersions.length,
      agentsCount: codingAgents.length,
      gitRepoId: gitRepo.id,
    });

    if (standardVersions.length === 0) {
      this.logger.warn('No standards provided for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    if (codingAgents.length === 0) {
      this.logger.warn('No coding agents specified for deployment');
      return { createOrUpdate: [], delete: [] };
    }

    const result = await this.deployerService.aggregateStandardsDeployments(
      standardVersions,
      gitRepo,
      codingAgents,
    );

    this.logger.info('Standards deployment prepared successfully', {
      filesCount: result.createOrUpdate.length + result.delete.length,
    });

    return result;
  }
}
