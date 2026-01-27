import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateStandardFromPlaybookUseCase,
  IPlaybookInput,
  ICreateStandardResult,
} from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';

export class CreateStandardFromPlaybookUseCase implements ICreateStandardFromPlaybookUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(playbook: IPlaybookInput): Promise<ICreateStandardResult> {
    const result = await this.gateway.createStandard({
      name: playbook.name,
      description: playbook.description,
      scope: playbook.scope,
      rules: playbook.rules,
    });

    return { standardId: result.id, name: result.name };
  }
}
