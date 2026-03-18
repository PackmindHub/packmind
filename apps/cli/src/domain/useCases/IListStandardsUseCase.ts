import { IPublicUseCase, SpaceId } from '@packmind/types';
import { ListedStandard } from '../repositories/IPackmindGateway';

export type ListStandardsCommand = { spaceId?: SpaceId };

export type ListStandardsResult = ListedStandard[];

export type IListStandardsUseCase = IPublicUseCase<
  ListStandardsCommand,
  ListStandardsResult
>;
