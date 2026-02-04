import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateStandardFromPlaybookUseCase,
  IPlaybookInput,
  ICreateStandardResult,
} from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';

export class CreateStandardFromPlaybookUseCase implements ICreateStandardFromPlaybookUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(playbook: IPlaybookInput): Promise<ICreateStandardResult> {
    const space = await this.gateway.spaces.getGlobal();

    const standard = await this.gateway.standards.create(space.id, {
      name: playbook.name,
      description: playbook.description,
      scope: playbook.scope,
      rules: playbook.rules.map((r) => ({
        content: r.content,
        examples: r.examples
          ? [
              {
                lang: r.examples.language,
                positive: r.examples.positive,
                negative: r.examples.negative,
              },
            ]
          : undefined,
      })),
    });

    return { standardId: standard.id, name: standard.name };
  }
}
