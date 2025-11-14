import { IPublicUseCase, Package } from '@packmind/types';

export type IListPackagesCommand = Record<string, never>;

export type IListPackagesResult = Package[];

export type IListPackagesUseCase = IPublicUseCase<
  IListPackagesCommand,
  IListPackagesResult
>;
