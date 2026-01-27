import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateStandardFromPlaybookUseCase,
  IPlaybookInput,
  ICreateStandardResult,
} from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';

export class CreateStandardFromPlaybookUseCase implements ICreateStandardFromPlaybookUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(playbook: IPlaybookInput): Promise<ICreateStandardResult> {
    const space = await this.gateway.getGlobalSpace();

    const standard = await this.gateway.createStandardInSpace(space.id, {
      name: playbook.name,
      description: playbook.description,
      scope: playbook.scope,
      rules: playbook.rules,
    });

    return { standardId: standard.id, name: standard.name };
  }
}
