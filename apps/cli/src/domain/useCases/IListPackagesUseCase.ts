import { IPublicUseCase, Package, SpaceId } from '@packmind/types';

export type IListPackagesCommand = { spaceId?: SpaceId };

export type IListPackagesResult = Package[];

export type IListPackagesUseCase = IPublicUseCase<
  IListPackagesCommand,
  IListPackagesResult
>;
