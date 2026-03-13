import {
  IListCommandsResult,
  IListCommandsUseCase,
} from '../../domain/useCases/IListCommandsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class ListCommandsUseCase implements IListCommandsUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(): Promise<IListCommandsResult> {
    const space = await this.spaceService.getGlobalSpace();
    const listCommandsResponse = await this.packmindGateway.commands.list({
      spaceId: space.id,
    });
    return listCommandsResponse.recipes;
  }
}
