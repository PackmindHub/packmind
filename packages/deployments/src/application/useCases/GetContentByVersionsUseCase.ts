import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ArtifactVersionEntry,
  CodingAgent,
  GetContentByVersionsCommand,
  GetContentByVersionsResponse,
  IAccountsPort,
  ICodingAgentPort,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  createRecipeId,
  createSkillId,
  createStandardId,
  normalizeCodingAgents,
} from '@packmind/types';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import {
  buildArtifactMetadataMap,
  enrichFileModificationsWithMetadata,
} from '../utils/ArtifactMetadataUtils';

const origin = 'GetContentByVersionsUseCase';

export class GetContentByVersionsUseCase extends AbstractMemberUseCase<
  GetContentByVersionsCommand,
  GetContentByVersionsResponse
> {
  constructor(
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly skillsPort: ISkillsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetContentByVersionsCommand & MemberContext,
  ): Promise<GetContentByVersionsResponse> {
    this.logger.info('Getting content by artifact versions', {
      organizationId: command.organizationId,
      artifactCount: command.artifacts.length,
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

    // Step 2: Group artifacts by type
    const standardEntries = command.artifacts.filter(
      (a) => a.type === 'standard',
    );
    const recipeEntries = command.artifacts.filter((a) => a.type === 'command');
    const skillEntries = command.artifacts.filter((a) => a.type === 'skill');

    this.logger.info('Grouped artifacts by type', {
      standardCount: standardEntries.length,
      recipeCount: recipeEntries.length,
      skillCount: skillEntries.length,
    });

    // Step 3: Fetch specific versions for each artifact type
    const [recipeVersions, standardVersionsWithRules, skillVersions] =
      await Promise.all([
        this.fetchRecipeVersions(recipeEntries),
        this.fetchStandardVersionsWithRules(standardEntries),
        this.fetchSkillVersionsWithFiles(skillEntries),
      ]);

    // Step 4: Render artifacts for coding agents
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

    // Step 5: Enrich file modifications with artifact metadata
    const recipeSpaceMap = new Map(recipeEntries.map((e) => [e.id, e.spaceId]));
    const standardSpaceMap = new Map(
      standardEntries.map((e) => [e.id, e.spaceId]),
    );
    const skillSpaceMap = new Map(skillEntries.map((e) => [e.id, e.spaceId]));

    const artifactMetadata = buildArtifactMetadataMap({
      recipes: { spaceIdMap: recipeSpaceMap, versions: recipeVersions },
      standards: {
        spaceIdMap: standardSpaceMap,
        versions: standardVersionsWithRules,
      },
      skills: { spaceIdMap: skillSpaceMap, versions: skillVersions },
    });

    enrichFileModificationsWithMetadata(
      fileUpdates.createOrUpdate,
      artifactMetadata,
    );

    // Step 6: Generate skill folders
    const skillFolderPaths =
      this.codingAgentPort.getSkillsFolderPathForAgents(codingAgents);

    const skillFolders = codingAgents.flatMap((agent) => {
      const skillPath = skillFolderPaths.get(agent);
      if (!skillPath) return [];
      return skillVersions.map((sv) => `${skillPath}${sv.slug}`);
    });

    this.logger.info('Successfully built content-by-versions response', {
      totalCreateOrUpdateCount: fileUpdates.createOrUpdate.length,
      totalDeleteCount: fileUpdates.delete.length,
      skillFolderCount: skillFolders.length,
    });

    return {
      fileUpdates,
      skillFolders,
    };
  }

  private async fetchRecipeVersions(
    entries: ArtifactVersionEntry[],
  ): Promise<RecipeVersion[]> {
    const results = await Promise.all(
      entries.map(async (entry) => {
        const recipeId = createRecipeId(entry.id);
        const version = await this.recipesPort.getRecipeVersion(
          recipeId,
          entry.version,
        );
        if (!version) {
          this.logger.warn('Recipe version not found', {
            recipeId: entry.id,
            version: entry.version,
          });
        }
        return version;
      }),
    );
    return results.filter((v): v is RecipeVersion => v !== null);
  }

  private async fetchStandardVersionsWithRules(
    entries: ArtifactVersionEntry[],
  ): Promise<StandardVersion[]> {
    const results = await Promise.all(
      entries.map(async (entry) => {
        const standardId = createStandardId(entry.id);
        const versions =
          await this.standardsPort.listStandardVersions(standardId);
        const matchingVersion = versions.find(
          (v) => v.version === entry.version,
        );
        if (!matchingVersion) {
          this.logger.warn('Standard version not found', {
            standardId: entry.id,
            version: entry.version,
          });
          return null;
        }
        const rules = await this.standardsPort.getRulesByStandardId(standardId);
        return { ...matchingVersion, rules };
      }),
    );
    return results.filter((v) => v !== null) as StandardVersion[];
  }

  private async fetchSkillVersionsWithFiles(
    entries: ArtifactVersionEntry[],
  ): Promise<SkillVersion[]> {
    const results = await Promise.all(
      entries.map(async (entry) => {
        const skillId = createSkillId(entry.id);
        const versions = await this.skillsPort.listSkillVersions(skillId);
        const matchingVersion = versions.find(
          (v) => v.version === entry.version,
        );
        if (!matchingVersion) {
          this.logger.warn('Skill version not found', {
            skillId: entry.id,
            version: entry.version,
          });
          return null;
        }
        const files = await this.skillsPort.getSkillFiles(matchingVersion.id);
        return { ...matchingVersion, files };
      }),
    );
    return results.filter((v) => v !== null) as SkillVersion[];
  }
}
