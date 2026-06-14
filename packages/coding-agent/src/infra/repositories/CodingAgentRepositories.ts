import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';
import { CodingAgentDeployerRegistry } from './CodingAgentDeployerRegistry';
import {
  FileUpdates,
  GitRepo,
  IStandardsPort,
  IGitPort,
  RenderedPluginFile,
  RenderPackageAsClaudePluginCommand,
  RenderPackageAsClaudePluginResponse,
  Target,
  createGitRepoId,
  createTargetId,
} from '@packmind/types';
import { ClaudePluginDeployer } from './claudePlugin/ClaudePluginDeployer';

/**
 * CodingAgentRepositories - Repository aggregator implementation for the CodingAgent domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * and provides them through getter methods.
 */
export class CodingAgentRepositories implements ICodingAgentRepositories {
  private readonly deployerRegistry: ICodingAgentDeployerRegistry;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly gitPort?: IGitPort,
  ) {
    // Initialize the deployer registry
    this.deployerRegistry = new CodingAgentDeployerRegistry(
      standardsPort,
      gitPort,
    );
  }

  getDeployerRegistry(): ICodingAgentDeployerRegistry {
    return this.deployerRegistry;
  }

  async renderPackageAsClaudePlugin(
    command: RenderPackageAsClaudePluginCommand,
  ): Promise<RenderPackageAsClaudePluginResponse> {
    const deployer = new ClaudePluginDeployer(this.standardsPort, this.gitPort);
    const target = this.buildSyntheticTarget(command.pluginRoot);
    // ClaudePluginDeployer does not read repository contents; only the id is
    // referenced in logs. A minimal synthetic repo keeps the contract honest.
    const gitRepo = { id: target.gitRepoId } as GitRepo;

    const manifestUpdate = deployer.deployPluginManifest(
      {
        name: command.pluginName,
        description: command.pluginDescription,
        version: command.pluginVersion,
      },
      target,
    );
    const commandsUpdate = await deployer.deployRecipes(
      command.recipeVersions,
      gitRepo,
      target,
    );
    const skillsUpdate = await deployer.deploySkills(
      command.skillVersions,
      gitRepo,
      target,
    );
    await deployer.deployStandards(command.standardVersions, gitRepo, target);

    return {
      files: this.toRenderedFiles([
        manifestUpdate,
        commandsUpdate,
        skillsUpdate,
      ]),
      skippedStandardsCount: deployer.getLastSkippedStandardsCount(),
    };
  }

  private buildSyntheticTarget(pluginRoot: string): Target {
    return {
      id: createTargetId('cli-plugin'),
      name: 'cli-plugin',
      path: pluginRoot,
      gitRepoId: createGitRepoId('cli-plugin'),
    };
  }

  private toRenderedFiles(updates: FileUpdates[]): RenderedPluginFile[] {
    return updates.flatMap((update) =>
      update.createOrUpdate
        .filter(
          (file): file is typeof file & { content: string } =>
            typeof file.content === 'string',
        )
        .map((file) => ({
          path: file.path,
          content: file.content,
        })),
    );
  }
}
