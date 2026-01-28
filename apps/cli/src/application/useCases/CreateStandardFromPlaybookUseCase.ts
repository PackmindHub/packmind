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
      rules: playbook.rules.map((r) => ({ content: r.content })),
    });

    const rulesWithExamples = playbook.rules.filter((r) => r.examples);

    if (rulesWithExamples.length > 0) {
      const createdRules = await this.gateway.getRulesForStandard(
        space.id,
        standard.id,
      );

      for (let i = 0; i < playbook.rules.length; i++) {
        const rule = playbook.rules[i];
        if (rule.examples && createdRules[i]) {
          try {
            await this.gateway.addExampleToRule(
              space.id,
              standard.id,
              createdRules[i].id,
              rule.examples,
            );
          } catch {
            // Example creation failure doesn't fail the whole operation
          }
        }
      }
    }

    return { standardId: standard.id, name: standard.name };
  }
}
