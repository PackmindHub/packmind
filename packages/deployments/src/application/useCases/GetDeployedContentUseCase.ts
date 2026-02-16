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
  normalizeCodingAgents,
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

    // Step 5: Fetch skill files for each skill version
    const skillVersions = await Promise.all(
      activeSkillVersions.map(async (skillVersion) => {
        const files = await this.skillsPort.getSkillFiles(skillVersion.id);
        return { ...skillVersion, files };
      }),
    );

    // Step 6: Render artifacts for coding agents
    const fileUpdates = await this.codingAgentPort.deployArtifactsForAgents({
      recipeVersions,
      standardVersions,
      skillVersions,
      codingAgents,
    });

    this.logger.info('Generated file updates', {
      createOrUpdateCount: fileUpdates.createOrUpdate.length,
      deleteCount: fileUpdates.delete.length,
    });

    // Step 7: Build artifact metadata from packages
    type ArtifactMetadata = { artifactId: string; spaceId: string };
    const artifactMetadata: Record<
      ArtifactType,
      Map<string, ArtifactMetadata>
    > = {
      command: new Map(),
      standard: new Map(),
      skill: new Map(),
    };

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

      const recipeSpaceMap = new Map(
        recipes.map((r) => [r.id as string, r.spaceId as string]),
      );
      const standardSpaceMap = new Map(
        standards.map((s) => [s.id as string, s.spaceId as string]),
      );
      const skillSpaceMap = new Map(
        skills.map((s) => [s.id as string, s.spaceId as string]),
      );

      for (const rv of recipeVersions) {
        const spaceId = recipeSpaceMap.get(rv.recipeId as string);
        if (spaceId) {
          artifactMetadata.command.set(rv.name, {
            artifactId: rv.recipeId as string,
            spaceId,
          });
        }
      }
      for (const sv of standardVersions) {
        const spaceId = standardSpaceMap.get(sv.standardId as string);
        if (spaceId) {
          artifactMetadata.standard.set(sv.name, {
            artifactId: sv.standardId as string,
            spaceId,
          });
        }
      }
      for (const skv of skillVersions) {
        const spaceId = skillSpaceMap.get(skv.skillId as string);
        if (spaceId) {
          artifactMetadata.skill.set(skv.name, {
            artifactId: skv.skillId as string,
            spaceId,
          });
        }
      }
    }

    // Step 8: Enrich file modifications with artifact metadata
    for (const file of fileUpdates.createOrUpdate) {
      if (file.artifactType && file.artifactName) {
        const metadata = artifactMetadata[file.artifactType].get(
          file.artifactName,
        );
        if (metadata) {
          file.artifactId = metadata.artifactId;
          file.spaceId = metadata.spaceId;
        }
      }
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

    // Step 10: Return response
    return { fileUpdates, skillFolders };
  }
}
