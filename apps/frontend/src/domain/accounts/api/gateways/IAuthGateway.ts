import {
  OrganizationId,
  UserId,
  UserOrganizationMembership,
  UserOrganizationRole,
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
    email: string;
    memberships: UserOrganizationMembership[];
  };
  organization?: {
    id: OrganizationId;
    name: string;
    slug: string;
    role: UserOrganizationRole;
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
