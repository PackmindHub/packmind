import { PackmindLogger } from '@packmind/logger';
import {
  DashboardKpiResponse,
  GetDashboardKpiCommand,
  IGetDashboardKpi,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
} from '@packmind/types';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';

const origin = 'GetDashboardKpiUseCase';

export class GetDashboardKpiUseCase implements IGetDashboardKpi {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetDashboardKpiCommand,
  ): Promise<DashboardKpiResponse> {
    const { organizationId, spaceId, userId } = command;

    const [standards, recipes, skills, activeCounts] = await Promise.all([
      this.standardsPort.listStandardsBySpace(spaceId, organizationId, userId),
      this.recipesPort.listRecipesBySpace({
        spaceId,
        organizationId,
        userId,
      }),
      this.skillsPort.listSkillsBySpace(spaceId, organizationId, userId),
      this.distributionRepository.countActiveArtifactsBySpace(
        organizationId,
        spaceId,
      ),
    ]);

    return {
      standards: {
        total: standards.length,
        active: activeCounts.standards,
      },
      recipes: {
        total: recipes.length,
        active: activeCounts.recipes,
      },
      skills: {
        total: skills.length,
        active: activeCounts.skills,
      },
    };
  }
}
