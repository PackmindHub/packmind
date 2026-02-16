import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
  ListProposalsOverview,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';

const origin = 'ListChangeProposalsBySpaceUseCase';

export class ListChangeProposalsBySpaceUseCase extends AbstractMemberUseCase<
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: ListChangeProposalsBySpaceCommand & MemberContext,
  ): Promise<ListChangeProposalsBySpaceResponse> {
    await validateSpaceOwnership(
      this.spacesPort,
      command.spaceId,
      command.organization.id,
    );

    const grouped = await this.service.groupProposalsByArtefact(
      command.spaceId,
    );

    const standards = await this.enrichStandardsWithNames(grouped.standards);
    const commands = await this.enrichRecipesWithNames(grouped.commands);
    const skills = await this.enrichSkillsWithNames(grouped.skills);

    return {
      standards,
      commands,
      skills,
    };
  }

  private async enrichStandardsWithNames(
    standardsMap: Map<StandardId, number>,
  ): Promise<ListProposalsOverview<StandardId>[]> {
    const result: ListProposalsOverview<StandardId>[] = [];

    for (const [artefactId, count] of standardsMap.entries()) {
      const standard = await this.standardsPort.getStandard(artefactId);
      if (standard) {
        result.push({
          artefactId,
          name: standard.name,
          changeProposalCount: count,
        });
      }
    }

    return result;
  }

  private async enrichRecipesWithNames(
    recipesMap: Map<RecipeId, number>,
  ): Promise<ListProposalsOverview<RecipeId>[]> {
    const result: ListProposalsOverview<RecipeId>[] = [];

    for (const [artefactId, count] of recipesMap.entries()) {
      const recipe = await this.recipesPort.getRecipeByIdInternal(artefactId);
      if (recipe) {
        result.push({
          artefactId,
          name: recipe.name,
          changeProposalCount: count,
        });
      }
    }

    return result;
  }

  private async enrichSkillsWithNames(
    skillsMap: Map<SkillId, number>,
  ): Promise<ListProposalsOverview<SkillId>[]> {
    const result: ListProposalsOverview<SkillId>[] = [];

    for (const [artefactId, count] of skillsMap.entries()) {
      const skill = await this.skillsPort.getSkill(artefactId);
      if (skill) {
        result.push({
          artefactId,
          name: skill.name,
          changeProposalCount: count,
        });
      }
    }

    return result;
  }
}
