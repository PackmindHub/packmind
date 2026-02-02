import { IPublicUseCase } from '@packmind/types';
import { ListedCommand } from '../repositories/IPackmindGateway';

export type IListCommandsCommand = Record<string, never>;

export type IListCommandsResult = ListedCommand[];

export type IListCommandsUseCase = IPublicUseCase<
  IListCommandsCommand,
  IListCommandsResult
>;
