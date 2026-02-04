import {
  Gateway,
  IGetMcpTokenUseCase,
  IGetMcpUrlUseCase,
} from '@packmind/types';

export interface IMcpGateway {
  getToken: Gateway<IGetMcpTokenUseCase>;
  getUrl: Gateway<IGetMcpUrlUseCase>;
}
