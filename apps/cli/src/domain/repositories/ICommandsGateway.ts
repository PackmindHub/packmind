// Create command types
import {
  Gateway,
  ICaptureCommandUseCase,
  IListCommandsBySpaceUseCase,
} from '@packmind/types';

export interface ICommandsGateway {
  create: Gateway<ICaptureCommandUseCase>;
  list: Gateway<IListCommandsBySpaceUseCase>;
}
