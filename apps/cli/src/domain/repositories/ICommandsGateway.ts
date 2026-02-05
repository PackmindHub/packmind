// Create command types
import {
  Gateway,
  ICaptureRecipeUseCase,
  IListRecipesBySpaceUseCase,
} from '@packmind/types';

export interface ICommandsGateway {
  create: Gateway<ICaptureRecipeUseCase>;
  list: Gateway<IListRecipesBySpaceUseCase>;
}
