import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateCommandFromPlaybookUseCase,
  ICommandPlaybookInput,
  ICreateCommandResult,
} from '../../domain/useCases/ICreateCommandFromPlaybookUseCase';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { Space } from '@packmind/types';

export class CreateCommandFromPlaybookUseCase implements ICreateCommandFromPlaybookUseCase {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async execute(
    playbook: ICommandPlaybookInput,
  ): Promise<ICreateCommandResult> {
    const space = await this.getSpace(playbook.spaceSlug);

    const command = await this.gateway.commands.create({
      spaceId: space.id,
      name: playbook.name,
      summary: playbook.summary,
      whenToUse: playbook.whenToUse,
      contextValidationCheckpoints: playbook.contextValidationCheckpoints,
      steps: playbook.steps.map((step) => ({
        name: step.name,
        description: step.description,
        codeSnippet: step.codeSnippet,
      })),
      originSkill: playbook.originSkill,
    });

    return {
      commandId: command.id,
      name: command.name,
      slug: command.slug,
    };
  }

  private async getSpace(spaceSlug?: string): Promise<Space> {
    const spaces = await this.spaceService.getSpaces();
    const normalizedSlug = spaceSlug?.replace(/^@/, '');

    if (normalizedSlug) {
      const found = spaces.find((s) => s.slug === normalizedSlug);
      if (!found) {
        const spaceList = spaces
          .map((s) => `  - ${s.slug}  (${s.name})`)
          .join('\n');
        throw new Error(
          `Space "${normalizedSlug}" not found. Available spaces:\n${spaceList}`,
        );
      }
      return found;
    }

    if (spaces.length > 1) {
      const spaceList = spaces
        .map((s) => `  - ${s.slug}  (${s.name})`)
        .join('\n');
      throw new Error(
        `Multiple spaces found. Please specify one using --space:\n${spaceList}`,
      );
    }

    return spaces[0];
  }
}
