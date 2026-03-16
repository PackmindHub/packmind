import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateCommandFromPlaybookUseCase,
  ICommandPlaybookInput,
  ICreateCommandResult,
} from '../../domain/useCases/ICreateCommandFromPlaybookUseCase';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class CreateCommandFromPlaybookUseCase implements ICreateCommandFromPlaybookUseCase {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async execute(
    playbook: ICommandPlaybookInput,
  ): Promise<ICreateCommandResult> {
    const space = await this.spaceService.getDefaultSpace();

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
}
