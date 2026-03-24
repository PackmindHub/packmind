import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateStandardFromPlaybookUseCase,
  IPlaybookInput,
  ICreateStandardResult,
} from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { resolveSpace } from '../utils/spaceUtils';

export class CreateStandardFromPlaybookUseCase implements ICreateStandardFromPlaybookUseCase {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async execute(playbook: IPlaybookInput): Promise<ICreateStandardResult> {
    const spaces = await this.spaceService.getSpaces();
    const space = resolveSpace(spaces, playbook.spaceSlug);

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
      originSkill: playbook.originSkill,
    });

    return { standardId: standard.id, name: standard.name };
  }
}
