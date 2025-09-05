import {
  SignInUserCommand,
  SignInUserResponse,
  SignUpUserCommand,
  User,
  GenerateApiKeyResponse,
  GetCurrentApiKeyResponse,
} from '@packmind/accounts';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  IAuthGateway,
  SignOutResponse,
  MeResponse,
  TokenResponse,
} from './IAuthGateway';

export class AuthGatewayApi extends PackmindGateway implements IAuthGateway {
  constructor() {
    super('/auth');
  }

  async signUp(request: SignUpUserCommand): Promise<User> {
    return this._api.post<User>(`${this._endpoint}/signup`, request);
  }

  async signIn(request: SignInUserCommand): Promise<SignInUserResponse> {
    return this._api.post<SignInUserResponse>(
      `${this._endpoint}/signin`,
      request,
    );
  }

  async signOut(): Promise<SignOutResponse> {
    return this._api.post<SignOutResponse>(`${this._endpoint}/signout`, {});
  }

  async getMe(): Promise<MeResponse> {
    return this._api.get<MeResponse>(`${this._endpoint}/me`);
  }

  async getMcpToken(): Promise<TokenResponse> {
    return this._api.get<TokenResponse>(`/mcp/token`);
  }

  async getMcpURL(): Promise<{ url: string }> {
    return this._api.get<{ url: string }>(`/mcp/url`);
  }

  async generateApiKey(request: {
    host: string;
  }): Promise<GenerateApiKeyResponse> {
    return this._api.post<GenerateApiKeyResponse>(
      `${this._endpoint}/api-key/generate`,
      request,
    );
  }

  async getCurrentApiKey(): Promise<GetCurrentApiKeyResponse> {
    return this._api.get<GetCurrentApiKeyResponse>(
      `${this._endpoint}/api-key/current`,
    );
  }
}
