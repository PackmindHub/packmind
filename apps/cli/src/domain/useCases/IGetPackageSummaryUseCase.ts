import {
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
} from '@packmind/types';

export type IGetPackageSummaryCommand = Omit<
  GetPackageSummaryCommand,
  'userId' | 'organizationId'
>;
export type IGetPackageSummaryResult = GetPackageSummaryResponse;

export interface IGetPackageSummaryUseCase {
  execute(
    command: IGetPackageSummaryCommand,
  ): Promise<IGetPackageSummaryResult>;
}
