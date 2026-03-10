import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ArtifactType,
  CodingAgent,
  GetDeployedContentCommand,
  GetDeployedContentResponse,
  IAccountsPort,
  ICodingAgentPort,
  ISkillsPort,
  IStandardsPort,
  normalizeCodingAgents,
  PackageId,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { PackageService } from '../services/PackageService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { TargetResolutionService } from '../services/TargetResolutionService';

const origin = 'GetDeployedContentUseCase';

export class GetDeployedContentUseCase extends AbstractMemberUseCase<
  GetDeployedContentCommand,
  GetDeployedContentResponse
> {
  constructor(
    private readonly targetResolutionService: TargetResolutionService,
    private readonly distributionRepository: IDistributionRepository,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly packageService: PackageService,
    private readonly skillsPort: ISkillsPort,
    private readonly standardsPort: IStandardsPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetDeployedContentCommand & MemberContext,
  ): Promise<GetDeployedContentResponse> {
    this.logger.info('Getting deployed content for target', {
      organizationId: command.organizationId,
      gitRemoteUrl: command.gitRemoteUrl,
      gitBranch: command.gitBranch,
      relativePath: command.relativePath,
    });

    // Step 1: Resolve coding agents
    let codingAgents: CodingAgent[];
    if (command.agents !== undefined) {
      codingAgents = normalizeCodingAgents(command.agents);
      this.logger.info('Using agents from command', { codingAgents });
    } else {
      codingAgents =
        await this.renderModeConfigurationService.resolveActiveCodingAgents(
          command.organization.id,
        );
      this.logger.info('Using organization-level render modes', {
        codingAgents,
      });
    }

    // Step 2: Resolve target from git info
    const target = await this.targetResolutionService.findTargetFromGitInfo(
      command.organization.id,
      command.userId,
      command.gitRemoteUrl,
      command.gitBranch,
      command.relativePath,
    );

    // Step 3: If no target found, return empty response
    if (!target) {
      this.logger.info('No target found, returning empty response');
      return {
        fileUpdates: { createOrUpdate: [], delete: [] },
        skillFolders: [],
      };
    }

    // Step 4: Fetch deployed versions
    const [standardVersions, recipeVersions, activeSkillVersions] =
      await Promise.all([
        this.distributionRepository.findActiveStandardVersionsByTarget(
          command.organization.id,
          target.id,
        ),
        this.distributionRepository.findActiveRecipeVersionsByTarget(
          command.organization.id,
          target.id,
        ),
        this.distributionRepository.findActiveSkillVersionsByTarget(
          command.organization.id,
          target.id,
        ),
      ]);

    this.logger.info('Fetched deployed versions', {
      standardCount: standardVersions.length,
      recipeCount: recipeVersions.length,
      skillCount: activeSkillVersions.length,
    });

    // Step 5: Fetch rules for each standard version
    const standardVersionsWithRules = await Promise.all(
      standardVersions.map(async (sv) => {
        const rules = await this.standardsPort.getRulesByStandardId(
          sv.standardId,
        );
        return { ...sv, rules };
      }),
    );

    // Step 6: Fetch skill files for each skill version
    const skillVersions = await Promise.all(
      activeSkillVersions.map(async (skillVersion) => {
        const files = await this.skillsPort.getSkillFiles(skillVersion.id);
        return { ...skillVersion, files };
      }),
    );

    // Step 7: Render artifacts for coding agents
    const fileUpdates = await this.codingAgentPort.deployArtifactsForAgents({
      recipeVersions,
      standardVersions: standardVersionsWithRules,
      skillVersions,
      codingAgents,
    });

    this.logger.info('Generated file updates', {
      createOrUpdateCount: fileUpdates.createOrUpdate.length,
      deleteCount: fileUpdates.delete.length,
    });

    // Step 8: Build artifact metadata from packages
    type ArtifactMetadata = {
      artifactId: string;
      spaceId: string;
      packageIds: string[];
    };
    const artifactMetadata: Record<
      ArtifactType,
      Map<string, ArtifactMetadata>
    > = {
      command: new Map(),
      standard: new Map(),
      skill: new Map(),
    };

    let allPackages: Awaited<
      ReturnType<PackageService['getPackagesBySlugsWithArtefacts']>
    > = [];

    if (command.packagesSlugs.length > 0) {
      allPackages = await this.packageService.getPackagesBySlugsWithArtefacts(
        command.packagesSlugs,
        command.organization.id,
      );

      // Build per-artifact maps: artifactId -> { spaceId, packageIds[] }
      const recipePackageMap = new Map<
        string,
        { spaceId: string; packageIds: string[] }
      >();
      const standardPackageMap = new Map<
        string,
        { spaceId: string; packageIds: string[] }
      >();
      const skillPackageMap = new Map<
        string,
        { spaceId: string; packageIds: string[] }
      >();

      for (const pkg of allPackages) {
        for (const recipe of pkg.recipes) {
          const existing = recipePackageMap.get(recipe.id as string);
          if (existing) {
            existing.packageIds.push(pkg.id as string);
          } else {
            recipePackageMap.set(recipe.id as string, {
              spaceId: recipe.spaceId as string,
              packageIds: [pkg.id as string],
            });
          }
        }
        for (const standard of pkg.standards) {
          const existing = standardPackageMap.get(standard.id as string);
          if (existing) {
            existing.packageIds.push(pkg.id as string);
          } else {
            standardPackageMap.set(standard.id as string, {
              spaceId: standard.spaceId as string,
              packageIds: [pkg.id as string],
            });
          }
        }
        for (const skill of pkg.skills) {
          const existing = skillPackageMap.get(skill.id as string);
          if (existing) {
            existing.packageIds.push(pkg.id as string);
          } else {
            skillPackageMap.set(skill.id as string, {
              spaceId: skill.spaceId as string,
              packageIds: [pkg.id as string],
            });
          }
        }
      }

      for (const rv of recipeVersions) {
        const info = recipePackageMap.get(rv.recipeId as string);
        if (info) {
          artifactMetadata.command.set(rv.name, {
            artifactId: rv.recipeId as string,
            spaceId: info.spaceId,
            packageIds: info.packageIds,
          });
        }
      }
      for (const sv of standardVersions) {
        const info = standardPackageMap.get(sv.standardId as string);
        if (info) {
          artifactMetadata.standard.set(sv.name, {
            artifactId: sv.standardId as string,
            spaceId: info.spaceId,
            packageIds: info.packageIds,
          });
        }
      }
      for (const skv of skillVersions) {
        const info = skillPackageMap.get(skv.skillId as string);
        if (info) {
          artifactMetadata.skill.set(skv.name, {
            artifactId: skv.skillId as string,
            spaceId: info.spaceId,
            packageIds: info.packageIds,
          });
        }
      }
    }

    // Step 9: Enrich file modifications with artifact metadata
    for (const file of fileUpdates.createOrUpdate) {
      if (file.artifactType && file.artifactName) {
        const metadata = artifactMetadata[file.artifactType].get(
          file.artifactName,
        );
        if (metadata) {
          file.artifactId = metadata.artifactId;
          file.spaceId = metadata.spaceId;
          file.packageIds = metadata.packageIds;
        }
      }
    }

    // Step 10: Generate skill folders
    const skillFolderPaths =
      this.codingAgentPort.getSkillsFolderPathForAgents(codingAgents);

    const skillFolders = codingAgents.flatMap((agent) => {
      const skillPath = skillFolderPaths.get(agent);
      if (!skillPath) return [];
      return skillVersions.map((sv) => `${skillPath}${sv.slug}`);
    });

    this.logger.info('Successfully built deployed content response', {
      totalCreateOrUpdateCount: fileUpdates.createOrUpdate.length,
      totalDeleteCount: fileUpdates.delete.length,
      skillFolderCount: skillFolders.length,
    });

    // Step 11: Extract package IDs from already-fetched packages
    const packageIds: PackageId[] | undefined =
      allPackages.length > 0 ? allPackages.map((pkg) => pkg.id) : undefined;

    // Step 12: Return response
    return {
      fileUpdates,
      skillFolders,
      targetId: target?.id,
      packageIds,
    };
  }
}
