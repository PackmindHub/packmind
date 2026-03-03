import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ChangeProposal,
  ChangeProposalType,
  CreationProposalOverview,
  IAccountsPort,
  IListChangeProposalsBySpace,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
  ListProposalsOverview,
  NewCommandPayload,
  NewSkillPayload,
  NewStandardPayload,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';

const origin = 'ListChangeProposalsBySpaceUseCase';

export class ListChangeProposalsBySpaceUseCase
  extends AbstractMemberUseCase<
    ListChangeProposalsBySpaceCommand,
    ListChangeProposalsBySpaceResponse
  >
  implements IListChangeProposalsBySpace
{
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
    const creations = this.enrichCreations(grouped.creations);

    return {
      standards,
      commands,
      skills,
      creations,
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

  private enrichCreations(
    proposals: ChangeProposal<ChangeProposalType>[],
  ): CreationProposalOverview[] {
    return proposals.map((proposal) => {
      if (proposal.type === ChangeProposalType.createStandard) {
        const payload = proposal.payload as NewStandardPayload;
        return {
          proposalId: proposal.id,
          artefactType: 'standards' as const,
          name: payload.name,
          description: payload.description,
          scope: Array.isArray(payload.scope)
            ? payload.scope.join(', ')
            : payload.scope,
          rules: payload.rules,
        };
      }
      if (proposal.type === ChangeProposalType.createSkill) {
        const payload = proposal.payload as NewSkillPayload;
        return {
          proposalId: proposal.id,
          artefactType: 'skills' as const,
          name: payload.name,
          description: payload.description,
          prompt: payload.prompt,
        };
      }
      const payload = proposal.payload as NewCommandPayload;
      return {
        proposalId: proposal.id,
        artefactType: 'commands' as const,
        name: payload.name,
        content: payload.content,
      };
    });
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
