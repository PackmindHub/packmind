import {
  SignInUserCommand,
  SignInUserResponse,
  SignUpUserCommand,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  User,
  GenerateApiKeyResponse,
  GetCurrentApiKeyResponse,
} from '@packmind/accounts';
import {
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
} from '@packmind/shared';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  IAuthGateway,
  SignOutResponse,
  MeResponse,
  TokenResponse,
  SelectOrganizationCommand,
  SelectOrganizationResponse,
  ValidateInvitationResponse,
} from './IAuthGateway';

export class AuthGatewayApi extends PackmindGateway implements IAuthGateway {
  constructor() {
    super('/auth');
  }

  async signUp(request: SignUpUserCommand): Promise<User> {
    return this._api.post<User>(`${this._endpoint}/signup`, request);
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

  async selectOrganization(
    request: SelectOrganizationCommand,
  ): Promise<SelectOrganizationResponse> {
    return this._api.post<SelectOrganizationResponse>(
      `${this._endpoint}/selectOrganization`,
      request,
    );
  }
}
