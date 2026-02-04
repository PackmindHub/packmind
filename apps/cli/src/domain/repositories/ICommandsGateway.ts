// Create command types
import {
  Gateway,
  ICaptureRecipeUseCase,
  IListRecipesBySpaceUseCase,
} from '@packmind/types';

// List Commands types
export type ListedCommand = {
  id: string;
  slug: string;
  name: string;
};

export type ListCommandsResult = ListedCommand[];

export interface ICommandsGateway {
  create: Gateway<ICaptureRecipeUseCase>;
  list: Gateway<IListRecipesBySpaceUseCase>;
  getBySlug(slug: string): Promise<ListedCommand | null>;
}
