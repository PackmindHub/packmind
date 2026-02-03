import { Gateway, IUseCase, PackmindCommand } from '@packmind/types';

// MCP Token types
export type GetMcpTokenCommand = PackmindCommand;

export type GetMcpTokenResult = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type IGetMcpTokenUseCase = IUseCase<
  GetMcpTokenCommand,
  GetMcpTokenResult
>;

// MCP URL types
export type GetMcpUrlCommand = PackmindCommand;

export type GetMcpUrlResult = {
  url: string;
};

export type IGetMcpUrlUseCase = IUseCase<GetMcpUrlCommand, GetMcpUrlResult>;

export interface IMcpGateway {
  getToken: Gateway<IGetMcpTokenUseCase>;
  getUrl: Gateway<IGetMcpUrlUseCase>;
}
