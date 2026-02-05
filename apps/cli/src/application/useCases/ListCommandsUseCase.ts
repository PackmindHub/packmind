import {
  IListCommandsResult,
  IListCommandsUseCase,
} from '../../domain/useCases/IListCommandsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListCommandsUseCase implements IListCommandsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListCommandsResult> {
    const space = await this.packmindGateway.spaces.getGlobal();
    const listCommandsResponse = await this.packmindGateway.commands.list({
      spaceId: space.id,
    });
    return listCommandsResponse.recipes;
  }
}
