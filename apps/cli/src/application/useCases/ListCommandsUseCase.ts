import {
  IListCommandsResult,
  IListCommandsUseCase,
} from '../../domain/useCases/IListCommandsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListCommandsUseCase implements IListCommandsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListCommandsResult> {
    return this.packmindGateway.commands.list();
  }
}
