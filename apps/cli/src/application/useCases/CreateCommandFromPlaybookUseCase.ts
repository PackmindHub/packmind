import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateCommandFromPlaybookUseCase,
  ICommandPlaybookInput,
  ICreateCommandResult,
} from '../../domain/useCases/ICreateCommandFromPlaybookUseCase';

export class CreateCommandFromPlaybookUseCase implements ICreateCommandFromPlaybookUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(
    playbook: ICommandPlaybookInput,
  ): Promise<ICreateCommandResult> {
    const space = await this.gateway.spaces.getGlobal();

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
    });

    return {
      commandId: command.id,
      name: command.name,
      slug: command.slug,
    };
  }
}
