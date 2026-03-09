import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ChangeProposalType,
  CreationChangeProposalTypes,
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
  PendingChangeProposal,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import {
  ArtefactProposalStats,
  ChangeProposalService,
} from '../../services/ChangeProposalService';
import { validateSpaceOwnership } from '../../services/validateSpaceOwnership';
import { isExpectedChangeProposalType } from '../../utils/isExpectedChangeProposalType';

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
    standardsMap: Map<StandardId, ArtefactProposalStats>,
  ): Promise<ListProposalsOverview<StandardId>[]> {
    const result: ListProposalsOverview<StandardId>[] = [];

    for (const [artefactId, stats] of standardsMap.entries()) {
      const standard = await this.standardsPort.getStandard(artefactId);
      if (standard) {
        result.push({
          artefactId,
          name: standard.name,
          changeProposalCount: stats.count,
          lastContributedAt: stats.lastContributedAt.toISOString(),
        });
      }
    }

    return result;
  }

  private async enrichRecipesWithNames(
    recipesMap: Map<RecipeId, ArtefactProposalStats>,
  ): Promise<ListProposalsOverview<RecipeId>[]> {
    const result: ListProposalsOverview<RecipeId>[] = [];

    for (const [artefactId, stats] of recipesMap.entries()) {
      const recipe = await this.recipesPort.getRecipeByIdInternal(artefactId);
      if (recipe) {
        result.push({
          artefactId,
          name: recipe.name,
          changeProposalCount: stats.count,
          lastContributedAt: stats.lastContributedAt.toISOString(),
        });
      }
    }

    return result;
  }

  private enrichCreations(
    proposals: PendingChangeProposal<CreationChangeProposalTypes>[],
  ): CreationProposalOverview[] {
    return proposals.map((proposal) => {
      const lastContributedAt = proposal.createdAt.toISOString();
      if (
        isExpectedChangeProposalType(proposal, ChangeProposalType.createCommand)
      ) {
        return {
          ...proposal,
          artefactType: 'commands' as const,
          name: proposal.payload.name,
          lastContributedAt,
        };
      }

      if (
        isExpectedChangeProposalType(
          proposal,
          ChangeProposalType.createStandard,
        )
      ) {
        return {
          ...proposal,
          artefactType: 'standards' as const,
          name: proposal.payload.name,
          payload: {
            ...proposal.payload,
            scope: Array.isArray(proposal.payload.scope)
              ? proposal.payload.scope.join(', ')
              : proposal.payload.scope,
          },
          lastContributedAt,
        };
      }
      if (
        isExpectedChangeProposalType(proposal, ChangeProposalType.createSkill)
      ) {
        return {
          ...proposal,
          artefactType: 'skills' as const,
          name: proposal.payload.name,
          lastContributedAt,
        };
      }

      throw new Error(
        `Unsupported creation ChangeProposalType: ${proposal.type}`,
      );
    });
  }

  private async enrichSkillsWithNames(
    skillsMap: Map<SkillId, ArtefactProposalStats>,
  ): Promise<ListProposalsOverview<SkillId>[]> {
    const result: ListProposalsOverview<SkillId>[] = [];

    for (const [artefactId, stats] of skillsMap.entries()) {
      const skill = await this.skillsPort.getSkill(artefactId);
      if (skill) {
        result.push({
          artefactId,
          name: skill.name,
          changeProposalCount: stats.count,
          lastContributedAt: stats.lastContributedAt.toISOString(),
        });
      }
    }

    return result;
  }
}
