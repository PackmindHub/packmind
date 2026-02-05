import {
  IListStandardsResult,
  IListStandardsUseCase,
} from '../../domain/useCases/IListStandardsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListStandardsUseCase implements IListStandardsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListStandardsResult> {
    const globalSpace = await this.packmindGateway.spaces.getGlobal();
    const listStandardsResponse = await this.packmindGateway.standards.list({
      spaceId: globalSpace.id,
    });

    return listStandardsResponse.standards;
  }
}
