import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetDeployedContentCommand,
  GetDeployedContentResponse,
  IAccountsPort,
  ICodingAgentPort,
  ISkillsPort,
  IStandardsPort,
  PackageId,
  PackageWithArtefacts,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { PackageService } from '../services/PackageService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { TargetResolutionService } from '../services/TargetResolutionService';
import {
  buildArtifactMetadataMap,
  enrichFileModificationsWithMetadata,
} from '../utils/ArtifactMetadataUtils';

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
    const codingAgents =
      await this.renderModeConfigurationService.resolveCodingAgents(
        command.agents,
        command.organization.id,
      );

    // Step 1b: If no git remote URL, skip tracking entirely
    if (!command.gitRemoteUrl || !command.gitBranch || !command.relativePath) {
      this.logger.info(
        'Skipping distribution tracking: no git remote URL provided',
      );
      return {
        fileUpdates: { createOrUpdate: [], delete: [] },
        skillFolders: [],
        resolvedAgents: codingAgents,
      };
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
        resolvedAgents: codingAgents,
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
        const rules = await this.standardsPort.getRulesByVersionId(sv.id);
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

    // Step 8: Build artifact metadata from packages and enrich file modifications
    let packages: PackageWithArtefacts[] = [];
    if (command.packagesSlugs.length > 0) {
      packages = await this.packageService.getPackagesBySlugsWithArtefacts(
        command.packagesSlugs,
        command.organization.id,
      );

      const allRecipes = packages.flatMap((pkg) => pkg.recipes);
      const allStandards = packages.flatMap((pkg) => pkg.standards);
      const allSkills = packages.flatMap((pkg) => pkg.skills);

      const recipes = [...new Map(allRecipes.map((r) => [r.id, r])).values()];
      const standards = [
        ...new Map(allStandards.map((s) => [s.id, s])).values(),
      ];
      const skills = [...new Map(allSkills.map((s) => [s.id, s])).values()];

      // Build packageIdMap per artifact type (artifact can belong to multiple packages)
      const recipePackageIdMap = new Map<string, string[]>();
      const standardPackageIdMap = new Map<string, string[]>();
      const skillPackageIdMap = new Map<string, string[]>();

      for (const pkg of packages) {
        for (const recipe of pkg.recipes) {
          const existing = recipePackageIdMap.get(recipe.id as string);
          if (existing) {
            existing.push(pkg.id as string);
          } else {
            recipePackageIdMap.set(recipe.id as string, [pkg.id as string]);
          }
        }
        for (const standard of pkg.standards) {
          const existing = standardPackageIdMap.get(standard.id as string);
          if (existing) {
            existing.push(pkg.id as string);
          } else {
            standardPackageIdMap.set(standard.id as string, [pkg.id as string]);
          }
        }
        for (const skill of pkg.skills) {
          const existing = skillPackageIdMap.get(skill.id as string);
          if (existing) {
            existing.push(pkg.id as string);
          } else {
            skillPackageIdMap.set(skill.id as string, [pkg.id as string]);
          }
        }
      }

      const artifactMetadata = buildArtifactMetadataMap({
        recipes: {
          spaceIdMap: new Map(
            recipes.map((r) => [r.id as string, r.spaceId as string]),
          ),
          packageIdMap: recipePackageIdMap,
          versions: recipeVersions,
        },
        standards: {
          spaceIdMap: new Map(
            standards.map((s) => [s.id as string, s.spaceId as string]),
          ),
          packageIdMap: standardPackageIdMap,
          versions: standardVersions,
        },
        skills: {
          spaceIdMap: new Map(
            skills.map((s) => [s.id as string, s.spaceId as string]),
          ),
          packageIdMap: skillPackageIdMap,
          versions: skillVersions,
        },
      });

      enrichFileModificationsWithMetadata(
        fileUpdates.createOrUpdate,
        artifactMetadata,
      );
    }

    // Step 9: Generate skill folders
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

    // Step 10: Extract package IDs
    let packageIds: PackageId[] = [];
    if (target) {
      packageIds = packages.map((pkg) => pkg.id);
    }

    // Step 11: Return response
    return {
      fileUpdates,
      skillFolders,
      targetId: target?.id,
      packageIds,
      resolvedAgents: codingAgents,
    };
  }
}
