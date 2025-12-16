import {
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  CreateCliLoginCodeCommand,
  CreateCliLoginCodeResponse,
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  CreateOrganizationCommand,
  ExchangeCliLoginCodeCommand,
  ExchangeCliLoginCodeResponse,
  GenerateApiKeyCommand,
  GenerateApiKeyResponse,
  GenerateTrialActivationTokenCommand,
  GenerateTrialActivationTokenResult,
  GenerateUserTokenCommand,
  GenerateUserTokenResponse,
  GetCurrentApiKeyCommand,
  GetCurrentApiKeyResponse,
  GetOrganizationByIdCommand,
  GetOrganizationByNameCommand,
  GetOrganizationBySlugCommand,
  GetOrganizationOnboardingStatusCommand,
  GetUserByIdCommand,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse,
  ListUserOrganizationsCommand,
  ListUserOrganizationsResponse,
  Organization,
  OrganizationId,
  OrganizationOnboardingStatus,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  ResetPasswordCommand,
  ResetPasswordResponse,
  SignInUserCommand,
  SignInUserResponse,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  StartTrialCommand,
  StartTrialResult,
  User,
  UserId,
  ValidateInvitationTokenCommand,
  ValidateInvitationTokenResponse,
  ValidatePasswordCommand,
  ValidatePasswordResetTokenCommand,
  ValidatePasswordResetTokenResponse,
} from '../index';

/**
 * Port interface for the Accounts domain adapter.
 * This interface defines all the operations that can be performed
 * on the accounts domain from external consumers.
 */
export const IAccountsPortName = 'IAccountsPort' as const;

export interface IAccountsPort {
  // User-related operations
  signUpWithOrganization(
    command: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse>;

  signInUser(command: SignInUserCommand): Promise<SignInUserResponse>;

  getUserById(command: GetUserByIdCommand): Promise<User | null>;
  getUserById(userId: UserId): Promise<User | null>;

  removeUserFromOrganization(
    command: RemoveUserFromOrganizationCommand,
  ): Promise<RemoveUserFromOrganizationResponse>;

  listOrganizationUserStatuses(
    command: ListOrganizationUserStatusesCommand,
  ): Promise<ListOrganizationUserStatusesResponse>;

  listOrganizationUsers(
    command: ListOrganizationUsersCommand,
  ): Promise<ListOrganizationUsersResponse>;

  validatePassword(command: ValidatePasswordCommand): Promise<boolean>;

  checkEmailAvailability(
    command: CheckEmailAvailabilityCommand,
  ): Promise<CheckEmailAvailabilityResponse>;

  // Organization-related operations
  createOrganization(command: CreateOrganizationCommand): Promise<Organization>;

  getOrganizationById(
    command: GetOrganizationByIdCommand,
  ): Promise<Organization | null>;
  getOrganizationById(
    organizationId: OrganizationId,
  ): Promise<Organization | null>;

  getOrganizationByName(
    command: GetOrganizationByNameCommand,
  ): Promise<Organization | null>;

  getOrganizationBySlug(
    command: GetOrganizationBySlugCommand,
  ): Promise<Organization | null>;

  listUserOrganizations(
    command: ListUserOrganizationsCommand,
  ): Promise<ListUserOrganizationsResponse>;

  generateUserToken(
    command: GenerateUserTokenCommand,
  ): Promise<GenerateUserTokenResponse>;

  createInvitations(
    command: CreateInvitationsCommand,
  ): Promise<CreateInvitationsResponse>;

  activateUserAccount(
    command: ActivateUserAccountCommand,
  ): Promise<ActivateUserAccountResponse>;

  validateInvitationToken(
    command: ValidateInvitationTokenCommand,
  ): Promise<ValidateInvitationTokenResponse>;

  changeUserRole(
    command: ChangeUserRoleCommand,
  ): Promise<ChangeUserRoleResponse>;

  // API key-related operations
  generateApiKey(
    command: GenerateApiKeyCommand,
  ): Promise<GenerateApiKeyResponse>;

  getCurrentApiKey(
    command: GetCurrentApiKeyCommand,
  ): Promise<GetCurrentApiKeyResponse>;

  // Password reset operations
  requestPasswordReset(
    command: RequestPasswordResetCommand,
  ): Promise<RequestPasswordResetResponse>;

  resetPassword(command: ResetPasswordCommand): Promise<ResetPasswordResponse>;

  validatePasswordResetToken(
    command: ValidatePasswordResetTokenCommand,
  ): Promise<ValidatePasswordResetTokenResponse>;

  // Onboarding operations
  getOrganizationOnboardingStatus(
    command: GetOrganizationOnboardingStatusCommand,
  ): Promise<OrganizationOnboardingStatus>;

  // CLI login operations
  createCliLoginCode(
    command: CreateCliLoginCodeCommand,
  ): Promise<CreateCliLoginCodeResponse>;

  exchangeCliLoginCode(
    command: ExchangeCliLoginCodeCommand,
  ): Promise<ExchangeCliLoginCodeResponse>;

  // Trial operations
  startTrial(command: StartTrialCommand): Promise<StartTrialResult>;

  generateTrialActivationToken(
    command: GenerateTrialActivationTokenCommand,
  ): Promise<GenerateTrialActivationTokenResult>;
}
