import { IPublicUseCase, Recipe, SpaceId } from '@packmind/types';
export type ListCommandsCommand = {
  spaceId?: SpaceId;
};

export type ListCommandsResult = Pick<
  Recipe,
  'id' | 'slug' | 'name' | 'spaceId'
>[];

export type IListCommandsUseCase = IPublicUseCase<
  ListCommandsCommand,
  ListCommandsResult
>;
