import {
  OrganizationId,
  UserId,
  UserOrganizationMembership,
  UserOrganizationRole,
  ISignUpWithOrganizationUseCase,
  ISignInUserUseCase,
  IGenerateApiKeyUseCase,
  IGetCurrentApiKeyUseCase,
  IGetMcpTokenUseCase,
  IGetMcpUrlUseCase,
  NewGateway,
  CreateCliLoginCodeResponse,
  GetUserOnboardingStatusResponse,
  CompleteUserOnboardingResponse,
} from '@packmind/types';
import {
  PublicGateway,
  Gateway,
  ICheckEmailAvailabilityUseCase,
  IActivateUserAccountUseCase,
  IActivateTrialAccountUseCase,
  IRequestPasswordResetUseCase,
  IResetPasswordUseCase,
  IValidatePasswordResetTokenUseCase,
  ValidatePasswordResetTokenResponse,
} from '@packmind/types';

export interface SignOutResponse {
  message: string;
}

export type MeResponse =
  | {
      message: string;
      authenticated: false;
      user?: never;
      organization?: never;
      organizations?: never;
    }
  | {
      message: string;
      authenticated: true;
      user: {
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
      organizations?: Array<{
        organization: {
          id: OrganizationId;
          name: string;
          slug: string;
        };
        role: UserOrganizationRole;
      }>;
    };

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

export type ValidatePasswordResetResponse = ValidatePasswordResetTokenResponse;

export interface SelectOrganizationCommand {
  organizationId: OrganizationId;
}

export interface SelectOrganizationResponse {
  message: string;
}

export interface IAuthGateway {
  signUpWithOrganization: PublicGateway<ISignUpWithOrganizationUseCase>;
  signIn: PublicGateway<ISignInUserUseCase>;
  checkEmailAvailability: PublicGateway<ICheckEmailAvailabilityUseCase>;
  signOut(): Promise<SignOutResponse>;
  getMe(): Promise<MeResponse>;
  getMcpToken: NewGateway<IGetMcpTokenUseCase>;
  getMcpURL: NewGateway<IGetMcpUrlUseCase>;
  getMcpConfig(command: { organizationId: OrganizationId }): Promise<{
    token: string;
    url: string;
    configs: {
      cursor: object;
      vscode: object;
      continue: object;
      claude: object;
      generic: object;
    };
  }>;
  generateApiKey: Gateway<IGenerateApiKeyUseCase>;
  getCurrentApiKey: PublicGateway<IGetCurrentApiKeyUseCase>;
  validateInvitationToken(token: string): Promise<ValidateInvitationResponse>;
  activateUserAccount: PublicGateway<IActivateUserAccountUseCase>;
  requestPasswordReset: PublicGateway<IRequestPasswordResetUseCase>;
  validatePasswordResetToken(
    token: string,
  ): Promise<ValidatePasswordResetResponse>;
  resetPassword: PublicGateway<IResetPasswordUseCase>;
  activateTrialAccount: PublicGateway<IActivateTrialAccountUseCase>;
  selectOrganization(
    request: SelectOrganizationCommand,
  ): Promise<SelectOrganizationResponse>;
  createCliLoginCode(): Promise<CreateCliLoginCodeResponse>;
  getOnboardingStatus(): Promise<GetUserOnboardingStatusResponse>;
  completeOnboarding(): Promise<CompleteUserOnboardingResponse>;
  getSocialProviders(): Promise<{ providers: string[] }>;
}
