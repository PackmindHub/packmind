import {
  OrganizationId,
  UserId,
  ISignUpUserUseCase,
  ISignInUserUseCase,
  IGenerateApiKeyUseCase,
  IGetCurrentApiKeyUseCase,
} from '@packmind/accounts/types';
import { PublicGateway } from '@packmind/shared';

export interface SignOutResponse {
  message: string;
}

export interface MeResponse {
  message: string;
  authenticated: boolean;
  user?: {
    id: UserId;
    username: string;
    organizationId: OrganizationId;
  };
  organization?: {
    id: OrganizationId;
    name: string;
    slug: string;
  };
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface IAuthGateway {
  signUp: PublicGateway<ISignUpUserUseCase>;
  signIn: PublicGateway<ISignInUserUseCase>;
  signOut(): Promise<SignOutResponse>;
  getMe(): Promise<MeResponse>;
  getMcpToken(): Promise<TokenResponse>;
  getMcpURL(): Promise<{ url: string }>;
  generateApiKey: PublicGateway<IGenerateApiKeyUseCase>;
  getCurrentApiKey: PublicGateway<IGetCurrentApiKeyUseCase>;
}
