import { PackmindLogger } from '@packmind/logger';
import {
  GetDashboardNonLiveCommand,
  DashboardNonLiveResponse,
  IGetDashboardNonLive,
  IStandardsPort,
  IRecipesPort,
  ISkillsPort,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';

const origin = 'GetDashboardNonLiveUseCase';

export class GetDashboardNonLiveUseCase implements IGetDashboardNonLive {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetDashboardNonLiveCommand,
  ): Promise<DashboardNonLiveResponse> {
    this.logger.info('Getting dashboard non-live artifacts', {
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });

    const organizationId = command.organizationId as OrganizationId;
    const spaceId = command.spaceId as SpaceId;

    const [standards, recipes, skills, deployedIds] = await Promise.all([
      this.standardsPort.listStandardsBySpace(
        spaceId,
        organizationId,
        command.userId,
      ),
      this.recipesPort.listRecipesBySpace({
        spaceId,
        organizationId,
        userId: command.userId,
      }),
      this.skillsPort.listSkillsBySpace(
        spaceId,
        organizationId,
        command.userId,
      ),
      this.distributionRepository.listDeployedArtifactIdsBySpace(
        organizationId,
        spaceId,
      ),
    ]);

    const deployedStandardIds = new Set(deployedIds.standardIds);
    const deployedRecipeIds = new Set(deployedIds.recipeIds);
    const deployedSkillIds = new Set(deployedIds.skillIds);

    return {
      standards: standards
        .filter((s) => !deployedStandardIds.has(s.id))
        .map((s) => ({ id: s.id, name: s.name })),
      recipes: recipes
        .filter((r) => !deployedRecipeIds.has(r.id))
        .map((r) => ({ id: r.id, name: r.name })),
      skills: skills
        .filter((s) => !deployedSkillIds.has(s.id))
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    };
  }
}
