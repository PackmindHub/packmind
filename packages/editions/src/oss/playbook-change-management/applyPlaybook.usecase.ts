import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ApplyPlaybookCommand,
  ApplyPlaybookProposalItem,
  ApplyPlaybookResponse,
  ChangeProposalType,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  NewCommandPayload,
  NewSkillPayload,
  NewStandardPayload,
  RecipeId,
  SkillId,
  StandardId,
  createOrganizationId,
  createRecipeId,
  createSkillId,
  createStandardId,
  createUserId,
} from '@packmind/types';

const origin = 'ApplyPlaybookUseCase';

type CreatedArtifact =
  | { type: 'standard'; id: StandardId }
  | { type: 'recipe'; id: RecipeId }
  | { type: 'skill'; id: SkillId };

export class ApplyPlaybookUseCase extends AbstractMemberUseCase<
  ApplyPlaybookCommand,
  ApplyPlaybookResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: ApplyPlaybookCommand & MemberContext,
  ): Promise<ApplyPlaybookResponse> {
    const { proposals, userId, organizationId } = command;

    const validationError = await this.validateSpaces(
      proposals,
      organizationId,
    );
    if (validationError) {
      return validationError;
    }

    const created: CreatedArtifact[] = [];

    for (let i = 0; i < proposals.length; i++) {
      try {
        const artifact = await this.createArtifact(
          proposals[i],
          userId,
          organizationId,
        );
        created.push(artifact);
      } catch (error) {
        await this.rollback(created);
        return {
          success: false,
          error: {
            index: i,
            type: proposals[i].type,
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    }

    return {
      success: true,
      created: {
        standards: created
          .filter((a) => a.type === 'standard')
          .map((a) => a.id as StandardId),
        commands: created
          .filter((a) => a.type === 'recipe')
          .map((a) => a.id as RecipeId),
        skills: created
          .filter((a) => a.type === 'skill')
          .map((a) => a.id as SkillId),
      },
    };
  }

  private async validateSpaces(
    proposals: ApplyPlaybookProposalItem[],
    organizationId: string,
  ): Promise<ApplyPlaybookResponse | null> {
    const uniqueSpaceIds = [...new Set(proposals.map((p) => p.spaceId))];
    for (const spaceId of uniqueSpaceIds) {
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space || space.organizationId !== organizationId) {
        const firstProposalIndex = proposals.findIndex(
          (p) => p.spaceId === spaceId,
        );
        return {
          success: false,
          error: {
            index: firstProposalIndex,
            type: proposals[firstProposalIndex].type,
            message: `Space ${spaceId} not found or does not belong to organization`,
          },
        };
      }
    }
    return null;
  }

  private async createArtifact(
    proposal: ApplyPlaybookProposalItem,
    userId: string,
    organizationId: string,
  ): Promise<CreatedArtifact> {
    const brandedUserId = createUserId(userId);
    const brandedOrgId = createOrganizationId(organizationId);
    const source = 'cli' as const;

    switch (proposal.type) {
      case ChangeProposalType.createSkill: {
        const payload = proposal.payload as NewSkillPayload;
        const result = await this.skillsPort.uploadSkill({
          userId,
          organizationId,
          source,
          spaceId: proposal.spaceId,
          files: this.buildSkillFiles(payload),
        });
        return { type: 'skill', id: createSkillId(result.skill.id) };
      }
      case ChangeProposalType.createStandard: {
        const payload = proposal.payload as NewStandardPayload;
        const result = await this.standardsPort.createStandardWithExamples({
          organizationId: brandedOrgId,
          userId: brandedUserId,
          source,
          spaceId: proposal.spaceId,
          name: payload.name,
          description: payload.description,
          summary: null,
          scope: this.normalizeScope(payload.scope),
          rules: payload.rules.map((r) => ({ content: r.content })),
        });
        return { type: 'standard', id: createStandardId(result.id) };
      }
      case ChangeProposalType.createCommand: {
        const payload = proposal.payload as NewCommandPayload;
        const result = await this.recipesPort.captureRecipe({
          userId,
          organizationId,
          source,
          spaceId: proposal.spaceId,
          name: payload.name,
          content: payload.content,
        });
        return { type: 'recipe', id: createRecipeId(result.id) };
      }
      default:
        throw new Error(`Unsupported proposal type: ${proposal.type}`);
    }
  }

  private async rollback(created: CreatedArtifact[]): Promise<void> {
    for (const artifact of [...created].reverse()) {
      try {
        switch (artifact.type) {
          case 'skill':
            await this.skillsPort.hardDeleteSkill(artifact.id);
            break;
          case 'standard':
            await this.standardsPort.hardDeleteStandard(artifact.id);
            break;
          case 'recipe':
            await this.recipesPort.hardDeleteRecipe(artifact.id);
            break;
        }
      } catch (rollbackError) {
        this.logger.error('Failed to rollback artifact during playbook apply', {
          artifactType: artifact.type,
          artifactId: artifact.id,
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError),
        });
      }
    }
  }

  private buildSkillFiles(payload: NewSkillPayload) {
    return (
      payload.files?.map((f) => ({
        path: f.path,
        content: f.content,
        permissions: f.permissions,
        isBase64: f.isBase64 ?? false,
      })) ?? []
    );
  }

  private normalizeScope(scope: string[] | string | null): string | null {
    if (Array.isArray(scope)) return scope.join(', ');
    return scope;
  }
}
