import {
  IListPackagesResult,
  IListPackagesUseCase,
} from '../../domain/useCases/IListPackagesUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListPackagesUseCase implements IListPackagesUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListPackagesResult> {
    return this.packmindGateway.listPackages({});
  }
}
