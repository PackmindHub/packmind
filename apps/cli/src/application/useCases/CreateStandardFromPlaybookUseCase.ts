import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreateStandardFromPlaybookUseCase,
  IPlaybookInput,
  ICreateStandardResult,
} from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { Space } from '@packmind/types';

export class CreateStandardFromPlaybookUseCase implements ICreateStandardFromPlaybookUseCase {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async execute(playbook: IPlaybookInput): Promise<ICreateStandardResult> {
    const space = await this.getSpace(playbook.spaceSlug);

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
