import {
  DefaultSkillMetadata,
  ICodingAgentDeployer,
} from '@packmind/coding-agent';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CodingAgent,
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IDeployDefaultSkillsUseCase,
  PackmindLockFileEntry,
  SkillVersion,
  createSkillId,
  createSkillVersionId,
  createUserId,
} from '@packmind/types';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PackmindLockFileService } from '../services/PackmindLockFileService';
import { enrichDefaultSkillsFileModifications } from '../utils/DefaultSkillsMetadataEnricher';
import {
  getDefaultSkillAuthorUserId,
  getDefaultSkillId,
  getDefaultSkillVersionId,
} from '../utils/defaultSkillIdUtils';

const origin = 'DeployDefaultSkillsUseCase';

export class DeployDefaultSkillsUseCase
  extends AbstractMemberUseCase<
    DeployDefaultSkillsCommand,
    DeployDefaultSkillsResponse
  >
  implements IDeployDefaultSkillsUseCase
{
  private readonly packmindLockFileService: PackmindLockFileService;

  constructor(
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly codingAgentPort: ICodingAgentPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
    packmindLockFileService: PackmindLockFileService = new PackmindLockFileService(
      logger,
    ),
  ) {
    super(accountsPort, logger);
    this.packmindLockFileService = packmindLockFileService;
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

    // Get active coding agents: use command.agents if provided, otherwise fall back to org-level config
    let codingAgents: CodingAgent[];
    if (command.agents !== undefined && command.agents.length > 0) {
      codingAgents = command.agents;
      this.logger.info('Using agents from command (packmind.json override)', {
        codingAgents,
        organizationId: command.organizationId,
      });
    } else {
      codingAgents =
        await this.renderModeConfigurationService.resolveActiveCodingAgents(
          command.organization.id,
        );
      this.logger.info('Using organization-level render modes', {
        codingAgents,
        organizationId: command.organizationId,
      });
    }

    const deployerRegistry = this.codingAgentPort.getDeployerRegistry();

    let skippedSkillsCount = 0;
    const deployedSkills: DefaultSkillMetadata[] = [];

    for (const codingAgent of codingAgents) {
      const deployer = deployerRegistry.getDeployer(
        codingAgent,
      ) as ICodingAgentDeployer;

      if (deployer.deployDefaultSkills) {
        this.logger.info('Deploying default skills for coding agent', {
          codingAgent,
        });

        const result = await deployer.deployDefaultSkills({
          cliVersion: command.cliVersion,
          includeBeta: command.includeBeta,
          excludeDeprecated: command.excludeDeprecated,
        });
        this.mergeFileUpdates(mergedFileUpdates, result.fileUpdates);
        skippedSkillsCount = result.skippedSkillsCount;
        if (result.deployedSkills) {
          for (const skill of result.deployedSkills) {
            if (
              !deployedSkills.some((existing) => existing.slug === skill.slug)
            ) {
              deployedSkills.push(skill);
            }
          }
        }

        this.logger.info('Default skills deployed for coding agent', {
          codingAgent,
          createOrUpdateCount: result.fileUpdates.createOrUpdate.length,
          deleteCount: result.fileUpdates.delete.length,
          skippedSkillsCount: result.skippedSkillsCount,
        });
      }
    }

    const enrichedFileUpdates = enrichDefaultSkillsFileModifications(
      mergedFileUpdates,
      deployedSkills,
    );

    const lockFileSlice = this.buildLockFileSlice(
      enrichedFileUpdates,
      deployedSkills,
      codingAgents,
    );

    this.logger.info('Default skills deployment completed', {
      organizationId: command.organizationId,
      totalCreateOrUpdateCount: enrichedFileUpdates.createOrUpdate.length,
      totalDeleteCount: enrichedFileUpdates.delete.length,
      skippedSkillsCount,
      lockFileSliceCount: Object.keys(lockFileSlice).length,
    });

    return {
      fileUpdates: enrichedFileUpdates,
      skippedSkillsCount,
      lockFileSlice,
    };
  }

  /**
   * Builds the default-skill slice of the lockfile `artifacts` map.
   *
   * The deployer-side `deployedSkills` metadata (slug, name, version) is
   * shaped into synthetic `SkillVersion` entries that `PackmindLockFileService.buildLockFile`
   * uses to populate its version lookup. Default skills are not persisted as
   * Packmind domain entities, so these synthetic versions are only used in
   * memory to drive lockfile-entry construction; nothing is written to the DB.
   *
   * Returns only the `artifacts` map from the resulting lockfile — callers
   * merge it into the local lockfile via the CLI flow.
   */
  private buildLockFileSlice(
    enrichedFileUpdates: FileUpdates,
    deployedSkills: DefaultSkillMetadata[],
    codingAgents: CodingAgent[],
  ): Record<string, PackmindLockFileEntry> {
    const syntheticUserId = createUserId(getDefaultSkillAuthorUserId());
    const skillVersions: SkillVersion[] = deployedSkills.map((skill) => ({
      id: createSkillVersionId(
        getDefaultSkillVersionId(skill.slug, skill.version),
      ),
      skillId: createSkillId(getDefaultSkillId(skill.slug)),
      version: skill.version,
      userId: syntheticUserId,
      name: skill.name,
      slug: skill.slug,
      description: '',
      prompt: '',
    }));

    const lockFile = this.packmindLockFileService.buildLockFile({
      fileModifications: enrichedFileUpdates.createOrUpdate.filter(
        (file) => file.artifactType && file.artifactId,
      ),
      recipeVersions: [],
      standardVersions: [],
      skillVersions,
      codingAgents,
      packageSlugs: [],
      artifactSpaceIds: {},
      artifactPackageIds: {},
      includeInstalledAt: false,
    });

    return lockFile.artifacts;
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
