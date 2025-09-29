import {
  OrganizationId,
  UserId,
  UserOrganizationMembership,
  UserOrganizationRole,
  ISignUpUserUseCase,
  ISignUpWithOrganizationUseCase,
  ISignInUserUseCase,
  IGenerateApiKeyUseCase,
  IGetCurrentApiKeyUseCase,
} from '@packmind/accounts/types';
import {
  PublicGateway,
  ICheckEmailAvailabilityUseCase,
  IActivateUserAccountUseCase,
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
} from '@packmind/shared';

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

export interface ValidateInvitationResponse {
  email: string;
  isValid: boolean;
}

export interface SelectOrganizationCommand {
  organizationId: OrganizationId;
}

export interface SelectOrganizationResponse {
  message: string;
}

export interface IAuthGateway {
  signUp: PublicGateway<ISignUpUserUseCase>;
  signUpWithOrganization: PublicGateway<ISignUpWithOrganizationUseCase>;
  signIn: PublicGateway<ISignInUserUseCase>;
  checkEmailAvailability: PublicGateway<ICheckEmailAvailabilityUseCase>;
  signOut(): Promise<SignOutResponse>;
  getMe(): Promise<MeResponse>;
  getMcpToken(): Promise<TokenResponse>;
  getMcpURL(): Promise<{ url: string }>;
  generateApiKey: PublicGateway<IGenerateApiKeyUseCase>;
  getCurrentApiKey: PublicGateway<IGetCurrentApiKeyUseCase>;
  validateInvitationToken(token: string): Promise<ValidateInvitationResponse>;
  activateUserAccount: PublicGateway<IActivateUserAccountUseCase>;
  selectOrganization(
    request: SelectOrganizationCommand,
  ): Promise<SelectOrganizationResponse>;
}
