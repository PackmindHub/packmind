import { ICodingAgentDeployer } from '@packmind/coding-agent';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IDeployDefaultSkillsUseCase,
} from '@packmind/types';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';

const origin = 'DeployDefaultSkillsUseCase';

export class DeployDefaultSkillsUseCase
  extends AbstractMemberUseCase<
    DeployDefaultSkillsCommand,
    DeployDefaultSkillsResponse
  >
  implements IDeployDefaultSkillsUseCase
{
  constructor(
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly codingAgentPort: ICodingAgentPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.logger.info('DeployDefaultSkillsUseCase initialized');
  }

  protected async executeForMembers(
    command: DeployDefaultSkillsCommand & MemberContext,
  ): Promise<DeployDefaultSkillsResponse> {
    this.logger.info('Deploying default skills', {
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const mergedFileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    const codingAgents =
      await this.renderModeConfigurationService.resolveActiveCodingAgents(
        command.organization.id,
      );

    this.logger.info('Active coding agents for organization', {
      organizationId: command.organizationId,
      codingAgents,
    });

    const deployerRegistry = this.codingAgentPort.getDeployerRegistry();

    for (const codingAgent of codingAgents) {
      const deployer = deployerRegistry.getDeployer(
        codingAgent,
      ) as ICodingAgentDeployer;

      if (deployer.deployDefaultSkills) {
        this.logger.info('Deploying default skills for coding agent', {
          codingAgent,
        });

        const fileUpdates = await deployer.deployDefaultSkills({
          cliVersion: command.cliVersion,
          includeBeta: command.includeBeta,
        });
        this.mergeFileUpdates(mergedFileUpdates, fileUpdates);

        this.logger.info('Default skills deployed for coding agent', {
          codingAgent,
          createOrUpdateCount: fileUpdates.createOrUpdate.length,
          deleteCount: fileUpdates.delete.length,
        });
      }
    }

    this.logger.info('Default skills deployment completed', {
      organizationId: command.organizationId,
      totalCreateOrUpdateCount: mergedFileUpdates.createOrUpdate.length,
      totalDeleteCount: mergedFileUpdates.delete.length,
    });

    return { fileUpdates: mergedFileUpdates };
  }

  private mergeFileUpdates(target: FileUpdates, source: FileUpdates): void {
    const existingPaths = new Set(target.createOrUpdate.map((f) => f.path));
    for (const file of source.createOrUpdate) {
      if (!existingPaths.has(file.path)) {
        target.createOrUpdate.push(file);
        existingPaths.add(file.path);
      }
    }

    const existingDeletePaths = new Set(target.delete.map((f) => f.path));
    for (const file of source.delete) {
      if (!existingDeletePaths.has(file.path)) {
        target.delete.push(file);
        existingDeletePaths.add(file.path);
      }
    }
  }
}
