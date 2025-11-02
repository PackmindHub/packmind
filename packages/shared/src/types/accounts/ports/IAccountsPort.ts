import {
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  SignInUserCommand,
  SignInUserResponse,
  GetUserByIdCommand,
  User,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse,
  ValidatePasswordCommand,
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  CreateOrganizationCommand,
  Organization,
  GetOrganizationByIdCommand,
  GetOrganizationByNameCommand,
  GetOrganizationBySlugCommand,
  ListUserOrganizationsCommand,
  ListUserOrganizationsResponse,
  GenerateUserTokenCommand,
  GenerateUserTokenResponse,
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
  ValidateInvitationTokenCommand,
  ValidateInvitationTokenResponse,
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  GenerateApiKeyCommand,
  GenerateApiKeyResponse,
  GetCurrentApiKeyCommand,
  GetCurrentApiKeyResponse,
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  ResetPasswordCommand,
  ResetPasswordResponse,
  ValidatePasswordResetTokenCommand,
  ValidatePasswordResetTokenResponse,
  GetOrganizationOnboardingStatusCommand,
  OrganizationOnboardingStatus,
} from '../index';

/**
 * Port interface for the Accounts domain adapter.
 * This interface defines all the operations that can be performed
 * on the accounts domain from external consumers.
 */
export interface IAccountsPort {
  // User-related operations
  signUpWithOrganization(
    command: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse>;

  signInUser(command: SignInUserCommand): Promise<SignInUserResponse>;

  getUserById(command: GetUserByIdCommand): Promise<User | null>;

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
}
