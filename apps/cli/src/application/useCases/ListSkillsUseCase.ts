import {
  IListSkillsResult,
  IListSkillsUseCase,
} from '../../domain/useCases/IListSkillsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { createSpaceId } from '@packmind/types';

export class ListSkillsUseCase implements IListSkillsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListSkillsResult> {
    const space = await this.packmindGateway.spaces.getGlobal();
    const skills = await this.packmindGateway.skills.list({
      spaceId: createSpaceId(space.id),
    });

    return skills.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
    }));
  }
}
