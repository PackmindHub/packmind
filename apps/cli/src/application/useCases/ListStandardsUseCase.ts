import {
  IListStandardsResult,
  IListStandardsUseCase,
} from '../../domain/useCases/IListStandardsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class ListStandardsUseCase implements IListStandardsUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(): Promise<IListStandardsResult> {
    const globalSpace = await this.spaceService.getDefaultSpace();
    const listStandardsResponse = await this.packmindGateway.standards.list({
      spaceId: globalSpace.id,
    });

    return listStandardsResponse.standards;
  }
}
