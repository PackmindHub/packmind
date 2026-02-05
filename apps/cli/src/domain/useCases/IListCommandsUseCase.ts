import { IPublicUseCase, Recipe } from '@packmind/types';
export type IListCommandsCommand = Record<string, never>;

export type IListCommandsResult = Pick<Recipe, 'id' | 'slug' | 'name'>[];

export type IListCommandsUseCase = IPublicUseCase<
  IListCommandsCommand,
  IListCommandsResult
>;
