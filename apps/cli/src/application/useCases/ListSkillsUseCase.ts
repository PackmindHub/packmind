import {
  IListSkillsResult,
  IListSkillsUseCase,
} from '../../domain/useCases/IListSkillsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { createSpaceId } from '@packmind/types';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class ListSkillsUseCase implements IListSkillsUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(): Promise<IListSkillsResult> {
    const space = await this.spaceService.getDefaultSpace();
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
