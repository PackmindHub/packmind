import {
  SignInUserCommand,
  SignInUserResponse,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  GenerateApiKeyResponse,
  GetCurrentApiKeyResponse,
  NewGateway,
  NewPackmindCommandBody,
  IGetMcpTokenUseCase,
  IGetMcpUrlUseCase,
  GetMcpTokenCommand,
  GetMcpTokenResponse,
  GetMcpUrlCommand,
  GetMcpUrlResponse,
  CreateCliLoginCodeResponse,
  GetUserOnboardingStatusResponse,
  CompleteUserOnboardingResponse,
} from '@packmind/types';
import {
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
  ActivateTrialAccountCommand,
  ActivateTrialAccountResult,
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  ResetPasswordCommand,
  ResetPasswordResponse,
  ValidatePasswordResetTokenResponse,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  IAuthGateway,
  SignOutResponse,
  MeResponse,
  SelectOrganizationCommand,
  SelectOrganizationResponse,
  ValidateInvitationResponse,
  ValidatePasswordResetResponse,
} from './IAuthGateway';

export class AuthGatewayApi extends PackmindGateway implements IAuthGateway {
  constructor() {
    super('/auth');
  }

  async signUpWithOrganization(
    request: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse> {
    return this._api.post<SignUpWithOrganizationResponse>(
      `${this._endpoint}/signup`,
      request,
    );
  }

  async signIn(request: SignInUserCommand): Promise<SignInUserResponse> {
    return this._api.post<SignInUserResponse>(
      `${this._endpoint}/signin`,
      request,
    );
  }

  async checkEmailAvailability(
    request: CheckEmailAvailabilityCommand,
  ): Promise<CheckEmailAvailabilityResponse> {
    return this._api.post<CheckEmailAvailabilityResponse>(
      `${this._endpoint}/check-email-availability`,
      request,
    );
  }

  async signOut(): Promise<SignOutResponse> {
    return this._api.post<SignOutResponse>(`${this._endpoint}/signout`, {});
  }

  async getMe(): Promise<MeResponse> {
    return this._api.get<MeResponse>(`${this._endpoint}/me`);
  }

  getMcpToken: NewGateway<IGetMcpTokenUseCase> = async ({
    organizationId,
  }: NewPackmindCommandBody<GetMcpTokenCommand>) => {
    return this._api.get<GetMcpTokenResponse>(
      `/organizations/${organizationId}/mcp/token`,
    );
  };

  getMcpURL: NewGateway<IGetMcpUrlUseCase> = async ({
    organizationId,
  }: NewPackmindCommandBody<GetMcpUrlCommand>) => {
    return this._api.get<GetMcpUrlResponse>(
      `/organizations/${organizationId}/mcp/url`,
    );
  };

  async getMcpConfig(command: { organizationId: string }): Promise<{
    token: string;
    url: string;
    configs: {
      cursor: object;
      vscode: object;
      continue: object;
      claude: object;
      generic: object;
    };
  }> {
    return this._api.get(`/organizations/${command.organizationId}/mcp/config`);
  }

  async generateApiKey(): Promise<GenerateApiKeyResponse> {
    return this._api.post<GenerateApiKeyResponse>(
      `${this._endpoint}/api-key/generate`,
      {},
    );
  }

  async getCurrentApiKey(): Promise<GetCurrentApiKeyResponse> {
    return this._api.get<GetCurrentApiKeyResponse>(
      `${this._endpoint}/api-key/current`,
    );
  }

  async validateInvitationToken(
    token: string,
  ): Promise<ValidateInvitationResponse> {
    return this._api.get<ValidateInvitationResponse>(
      `${this._endpoint}/validate-invitation/${token}`,
    );
  }

  async activateUserAccount(
    request: ActivateUserAccountCommand,
  ): Promise<ActivateUserAccountResponse> {
    return this._api.post<ActivateUserAccountResponse>(
      `${this._endpoint}/activate/${request.token}`,
      { password: request.password },
    );
  }

  async requestPasswordReset(
    request: RequestPasswordResetCommand,
  ): Promise<RequestPasswordResetResponse> {
    return this._api.post<RequestPasswordResetResponse>(
      `${this._endpoint}/forgot-password`,
      request,
    );
  }

  async validatePasswordResetToken(
    token: string,
  ): Promise<ValidatePasswordResetResponse> {
    return this._api.get<ValidatePasswordResetTokenResponse>(
      `${this._endpoint}/validate-password-reset/${token}`,
    );
  }

  async resetPassword(
    request: ResetPasswordCommand,
  ): Promise<ResetPasswordResponse> {
    return this._api.post<ResetPasswordResponse>(
      `${this._endpoint}/reset-password`,
      request,
    );
  }

  async activateTrialAccount(
    request: ActivateTrialAccountCommand,
  ): Promise<ActivateTrialAccountResult> {
    return this._api.post<ActivateTrialAccountResult>(
      `${this._endpoint}/activate-trial-account`,
      request,
    );
  }

  async selectOrganization(
    request: SelectOrganizationCommand,
  ): Promise<SelectOrganizationResponse> {
    return this._api.post<SelectOrganizationResponse>(
      `${this._endpoint}/selectOrganization`,
      request,
    );
  }

  async createCliLoginCode(): Promise<CreateCliLoginCodeResponse> {
    return this._api.post<CreateCliLoginCodeResponse>(
      `${this._endpoint}/cli-login-code`,
      {},
    );
  }

  async getOnboardingStatus(): Promise<GetUserOnboardingStatusResponse> {
    return this._api.get<GetUserOnboardingStatusResponse>(
      `${this._endpoint}/onboarding-status`,
    );
  }

  async completeOnboarding(): Promise<CompleteUserOnboardingResponse> {
    return this._api.post<CompleteUserOnboardingResponse>(
      `${this._endpoint}/complete-onboarding`,
      {},
    );
  }

  async getSocialProviders(): Promise<{ providers: string[] }> {
    return this._api.get<{ providers: string[] }>(
      `${this._endpoint}/social/providers`,
    );
  }
}
