import {
  IListPackagesResult,
  IListPackagesUseCase,
} from '../../domain/useCases/IListPackagesUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListPackagesUseCase implements IListPackagesUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListPackagesResult> {
    const listPackagesResponse = await this.packmindGateway.packages.list({});
    return listPackagesResponse.packages;
  }
}
