import {
  ListCommandsResult,
  IListCommandsUseCase,
  ListCommandsCommand,
} from '../../domain/useCases/IListCommandsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class ListCommandsUseCase implements IListCommandsUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(
    command: ListCommandsCommand,
  ): Promise<ListCommandsResult> {
    if (command.spaceId) {
      const response = await this.packmindGateway.commands.list({
        spaceId: command.spaceId,
      });
      return response.recipes;
    }

    const spaces = await this.spaceService.getSpaces();
    const results = await Promise.all(
      spaces.map((space) =>
        this.packmindGateway.commands
          .list({ spaceId: space.id })
          .then((r) => r.recipes),
      ),
    );
    return results.flat();
  }
}
