import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
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

    // Step 8: Build artifact metadata from packages and enrich file modifications
    if (command.packagesSlugs.length > 0) {
      const packages =
        await this.packageService.getPackagesBySlugsWithArtefacts(
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

      const artifactMetadata = buildArtifactMetadataMap({
        recipes: {
          spaceIdMap: new Map(
            recipes.map((r) => [r.id as string, r.spaceId as string]),
          ),
          versions: recipeVersions,
        },
        standards: {
          spaceIdMap: new Map(
            standards.map((s) => [s.id as string, s.spaceId as string]),
          ),
          versions: standardVersions,
        },
        skills: {
          spaceIdMap: new Map(
            skills.map((s) => [s.id as string, s.spaceId as string]),
          ),
          versions: skillVersions,
        },
      });

      enrichFileModificationsWithMetadata(
        fileUpdates.createOrUpdate,
        artifactMetadata,
      );
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

    // Step 11: Extract package IDs
    let packageIds: PackageId[] | undefined;
    if (command.packagesSlugs.length > 0 && target) {
      const packages =
        await this.packageService.getPackagesBySlugsWithArtefacts(
          command.packagesSlugs,
          command.organization.id,
        );
      packageIds = packages.map((pkg) => pkg.id);
    }

    // Step 12: Return response
    return {
      fileUpdates,
      skillFolders,
      targetId: target?.id,
      packageIds,
    };
  }
}
