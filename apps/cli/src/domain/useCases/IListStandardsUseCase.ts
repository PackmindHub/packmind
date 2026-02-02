import { IPublicUseCase } from '@packmind/types';
import { ListedStandard } from '../repositories/IPackmindGateway';

export type IListStandardsCommand = Record<string, never>;

export type IListStandardsResult = ListedStandard[];

export type IListStandardsUseCase = IPublicUseCase<
  IListStandardsCommand,
  IListStandardsResult
>;
