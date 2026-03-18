import {
  IListSkillsCommand,
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

  public async execute(
    command: IListSkillsCommand,
  ): Promise<IListSkillsResult> {
    if (command.spaceId) {
      const skills = await this.packmindGateway.skills.list({
        spaceId: command.spaceId,
      });
      return skills.map((s) => ({
        slug: s.slug,
        name: s.name,
        description: s.description,
        spaceId: command.spaceId as string,
      }));
    }

    const spaces = await this.spaceService.getSpaces();
    const results = await Promise.all(
      spaces.map((space) =>
        this.packmindGateway.skills
          .list({ spaceId: createSpaceId(space.id) })
          .then((skills) =>
            skills.map((s) => ({
              slug: s.slug,
              name: s.name,
              description: s.description,
              spaceId: space.id as string,
            })),
          ),
      ),
    );
    return results.flat();
  }
}
