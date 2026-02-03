import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  IGetPackageSummaryCommand,
  IGetPackageSummaryResult,
  IGetPackageSummaryUseCase,
} from '../../domain/useCases/IGetPackageSummaryUseCase';

export class GetPackageSummaryUseCase implements IGetPackageSummaryUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(
    command: IGetPackageSummaryCommand,
  ): Promise<IGetPackageSummaryResult> {
    return this.gateway.packages.getSummary(command);
  }
}
