import {
  IListStandardsResult,
  IListStandardsUseCase,
} from '../../domain/useCases/IListStandardsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListStandardsUseCase implements IListStandardsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListStandardsResult> {
    return this.packmindGateway.standards.list();
  }
}
