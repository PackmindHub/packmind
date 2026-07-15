import { IPublicUseCase, Command, SpaceId } from '@packmind/types';
export type ListCommandsCommand = {
  spaceId?: SpaceId;
};

export type ListCommandsResult = Pick<
  Command,
  'id' | 'slug' | 'name' | 'spaceId'
>[];

export type IListCommandsUseCase = IPublicUseCase<
  ListCommandsCommand,
  ListCommandsResult
>;
