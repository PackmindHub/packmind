import { SignUpWithOrganizationUseCase } from './signUpWithOrganization/SignUpWithOrganizationUseCase';
import { CheckEmailAvailabilityUseCase } from './checkEmailAvailability/CheckEmailAvailabilityUseCase';
import { SignInUserUseCase } from './signInUser/SignInUserUseCase';
import { GetUserByIdUseCase } from './getUserById/GetUserByIdUseCase';
import { RemoveUserFromOrganizationUseCase } from './removeUserFromOrganization/RemoveUserFromOrganizationUseCase';
import { ListOrganizationUserStatusesUseCase } from './listOrganizationUserStatuses/ListOrganizationUserStatusesUseCase';
import { ListOrganizationUsersUseCase } from './listOrganizationUsers/ListOrganizationUsersUseCase';
import { ValidatePasswordUseCase } from './validatePasswordUseCase/ValidatePasswordUseCase';
import { CreateOrganizationUseCase } from './createOrganization/CreateOrganizationUseCase';
import { GetOrganizationByIdUseCase } from './getOrganizationById/GetOrganizationByIdUseCase';
import { GetOrganizationByNameUseCase } from './getOrganizationByName/GetOrganizationByNameUseCase';
import { GetOrganizationBySlugUseCase } from './getOrganizationBySlug/GetOrganizationBySlugUseCase';
import { CreateInvitationsUseCase } from './createInvitations/CreateInvitationsUseCase';
import { GenerateUserTokenUseCase } from './generateUserToken/GenerateUserTokenUseCase';
import { ListUserOrganizationsUseCase } from './listUserOrganizations/ListUserOrganizationsUseCase';
import { GenerateApiKeyUseCase } from './generateApiKey/GenerateApiKeyUseCase';
import { GetCurrentApiKeyUseCase } from './getCurrentApiKey/GetCurrentApiKeyUseCase';
import { ActivateUserAccountUseCase } from './activateUserAccount/ActivateUserAccountUseCase';
import { ValidateInvitationTokenUseCase } from './validateInvitationToken/ValidateInvitationTokenUseCase';
import { ChangeUserRoleUseCase } from './changeUserRole/ChangeUserRoleUseCase';
import { RequestPasswordResetUseCase } from './RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from './ResetPasswordUseCase';
import { ValidatePasswordResetTokenUseCase } from './ValidatePasswordResetTokenUseCase';
import { IAccountsServices } from '../IAccountsServices';
import { PackmindLogger } from '@packmind/shared';
import { ISpacesPort } from '@packmind/shared/types';

import {
  ISignUpWithOrganizationUseCase,
  ISignInUserUseCase,
  IGetUserByIdUseCase,
  IListOrganizationUserStatusesUseCase,
  IListOrganizationUsersUseCase,
  IValidatePasswordUseCase,
  ICreateOrganizationUseCase,
  IGetOrganizationByIdUseCase,
  IGetOrganizationByNameUseCase,
  IGetOrganizationBySlugUseCase,
  IGenerateUserTokenUseCase,
  IGenerateApiKeyUseCase,
  IGetCurrentApiKeyUseCase,
  ICreateInvitationsUseCase,
  IRemoveUserFromOrganizationUseCase,
  IListUserOrganizationsUseCase,
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  SignUpWithOrganizationCommand,
  SignInUserCommand,
  GetUserByIdCommand,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse,
  ValidatePasswordCommand,
  CreateOrganizationCommand,
  GetOrganizationByIdCommand,
  GetOrganizationBySlugCommand,
  GenerateUserTokenCommand,
  GenerateApiKeyCommand,
  GetCurrentApiKeyCommand,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
  ListUserOrganizationsCommand,
  ListUserOrganizationsResponse,
} from '../../domain/useCases';
import {
  ICheckEmailAvailabilityUseCase,
  CheckEmailAvailabilityCommand,
  IActivateUserAccountUseCase,
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
  IChangeUserRoleUseCase,
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  IRequestPasswordResetUseCase,
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  IResetPasswordUseCase,
  ResetPasswordCommand,
  ResetPasswordResponse,
  IValidatePasswordResetTokenUseCase,
  ValidatePasswordResetTokenCommand,
  ValidatePasswordResetTokenResponse,
} from '@packmind/shared';
import {
  IValidateInvitationTokenUseCase,
  ValidateInvitationTokenCommand,
  ValidateInvitationTokenResponse,
} from './validateInvitationToken/ValidateInvitationTokenUseCase';
import { GetOrganizationByNameCommand } from '../../domain/useCases/IGetOrganizationByNameUseCase';

const origin = 'AccountsUseCases';

export class AccountsUseCases {
  private readonly _signUpWithOrganization: ISignUpWithOrganizationUseCase;
  private readonly _signInUser: ISignInUserUseCase;
  private readonly _getUserById: IGetUserByIdUseCase;
  private readonly _removeUserFromOrganization: IRemoveUserFromOrganizationUseCase;
  private readonly _listOrganizationUserStatuses: IListOrganizationUserStatusesUseCase;
  private readonly _listOrganizationUsers: IListOrganizationUsersUseCase;
  private readonly _validatePassword: IValidatePasswordUseCase;
  private readonly _createOrganization: ICreateOrganizationUseCase;
  private readonly _getOrganizationById: IGetOrganizationByIdUseCase;
  private readonly _getOrganizationByName: IGetOrganizationByNameUseCase;
  private readonly _getOrganizationBySlug: IGetOrganizationBySlugUseCase;
  private readonly _generateUserToken: IGenerateUserTokenUseCase;
  private readonly _createInvitations: ICreateInvitationsUseCase;
  private readonly _activateUserAccount: IActivateUserAccountUseCase;
  private readonly _validateInvitationToken: IValidateInvitationTokenUseCase;
  private readonly _generateApiKey?: IGenerateApiKeyUseCase;
  private readonly _getCurrentApiKey?: IGetCurrentApiKeyUseCase;
  private readonly _checkEmailAvailability: ICheckEmailAvailabilityUseCase;
  private readonly _changeUserRole: IChangeUserRoleUseCase;
  private readonly _listUserOrganizations: IListUserOrganizationsUseCase;
  private readonly _requestPasswordReset: IRequestPasswordResetUseCase;
  private readonly _resetPassword: IResetPasswordUseCase;
  private readonly _validatePasswordResetToken: IValidatePasswordResetTokenUseCase;

  constructor(
    private readonly accountsServices: IAccountsServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly spacesPort?: ISpacesPort,
  ) {
    this._signUpWithOrganization = new SignUpWithOrganizationUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
      this.logger,
      this.spacesPort,
    );
    this._signInUser = new SignInUserUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
      accountsServices.getLoginRateLimiterService(),
    );
    this._getUserById = new GetUserByIdUseCase(
      accountsServices.getUserService(),
    );
    this._removeUserFromOrganization = new RemoveUserFromOrganizationUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
      accountsServices.getUserService(),
      this.logger,
    );
    this._listOrganizationUserStatuses =
      new ListOrganizationUserStatusesUseCase(
        accountsServices.getUserService(),
        accountsServices.getOrganizationService(),
        accountsServices.getUserService(),
        accountsServices.getInvitationService(),
        this.logger,
      );
    this._listOrganizationUsers = new ListOrganizationUsersUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
      accountsServices.getUserService(),
      this.logger,
    );
    this._validatePassword = new ValidatePasswordUseCase(
      accountsServices.getUserService(),
    );
    this._createOrganization = new CreateOrganizationUseCase(
      accountsServices.getOrganizationService(),
      accountsServices.getUserService(),
      this.logger,
      this.spacesPort,
    );
    this._getOrganizationById = new GetOrganizationByIdUseCase(
      accountsServices.getOrganizationService(),
    );
    this._getOrganizationByName = new GetOrganizationByNameUseCase(
      accountsServices.getOrganizationService(),
    );
    this._getOrganizationBySlug = new GetOrganizationBySlugUseCase(
      accountsServices.getOrganizationService(),
    );
    this._generateUserToken = new GenerateUserTokenUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
    );
    this._checkEmailAvailability = new CheckEmailAvailabilityUseCase(
      accountsServices.getUserService(),
    );
    this._listUserOrganizations = new ListUserOrganizationsUseCase(
      accountsServices.getUserService(),
    );
    this._createInvitations = new CreateInvitationsUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
      accountsServices.getUserService(),
      accountsServices.getInvitationService(),
      this.logger,
    );
    this._activateUserAccount = new ActivateUserAccountUseCase(
      accountsServices.getUserService(),
      accountsServices.getInvitationService(),
      this.logger,
    );
    this._validateInvitationToken = new ValidateInvitationTokenUseCase(
      accountsServices.getInvitationService(),
      accountsServices.getUserService(),
      this.logger,
    );
    this._changeUserRole = new ChangeUserRoleUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
      accountsServices.getUserService(),
      this.logger,
    );
    this._requestPasswordReset = new RequestPasswordResetUseCase(
      accountsServices.getUserService(),
      accountsServices.getPasswordResetTokenService(),
      this.logger,
    );
    this._resetPassword = new ResetPasswordUseCase(
      accountsServices.getUserService(),
      accountsServices.getPasswordResetTokenService(),
      accountsServices.getLoginRateLimiterService(),
      this.logger,
    );
    this._validatePasswordResetToken = new ValidatePasswordResetTokenUseCase(
      accountsServices.getPasswordResetTokenService(),
      accountsServices.getUserService(),
      this.logger,
    );

    // API key use cases are optional since they require additional dependencies
    const apiKeyService = accountsServices.getApiKeyService?.();
    if (apiKeyService) {
      this._generateApiKey = new GenerateApiKeyUseCase(
        accountsServices.getUserService(),
        accountsServices.getOrganizationService(),
        apiKeyService,
        this.logger,
      );
      this._getCurrentApiKey = new GetCurrentApiKeyUseCase(this.logger);
      this.logger.debug('API key use cases initialized');
    } else {
      this.logger.debug('API key use cases skipped - service not available');
    }

    this.logger.info('AccountsUseCases initialized successfully');
  }

  // User-related use cases
  public async signUpWithOrganization(command: SignUpWithOrganizationCommand) {
    return this._signUpWithOrganization.execute(command);
  }

  public async signInUser(command: SignInUserCommand) {
    return this._signInUser.execute(command);
  }

  public async getUserById(command: GetUserByIdCommand) {
    const result = await this._getUserById.execute(command);
    return result.user;
  }

  public async removeUserFromOrganization(
    command: RemoveUserFromOrganizationCommand,
  ): Promise<RemoveUserFromOrganizationResponse> {
    return this._removeUserFromOrganization.execute(command);
  }

  public async listOrganizationUserStatuses(
    command: ListOrganizationUserStatusesCommand,
  ): Promise<ListOrganizationUserStatusesResponse> {
    return await this._listOrganizationUserStatuses.execute(command);
  }

  public async listOrganizationUsers(
    command: ListOrganizationUsersCommand,
  ): Promise<ListOrganizationUsersResponse> {
    return await this._listOrganizationUsers.execute(command);
  }

  public async validatePassword(command: ValidatePasswordCommand) {
    const result = await this._validatePassword.execute(command);
    return result.isValid;
  }

  public async checkEmailAvailability(command: CheckEmailAvailabilityCommand) {
    return this._checkEmailAvailability.execute(command);
  }

  // Organization-related use cases
  public async createOrganization(command: CreateOrganizationCommand) {
    const result = await this._createOrganization.execute(command);
    return result.organization;
  }

  public async getOrganizationById(command: GetOrganizationByIdCommand) {
    const result = await this._getOrganizationById.execute(command);
    return result.organization;
  }

  public async getOrganizationByName(command: GetOrganizationByNameCommand) {
    const result = await this._getOrganizationByName.execute(command);
    return result.organization;
  }

  public async getOrganizationBySlug(command: GetOrganizationBySlugCommand) {
    const result = await this._getOrganizationBySlug.execute(command);
    return result.organization;
  }

  public async listUserOrganizations(
    command: ListUserOrganizationsCommand,
  ): Promise<ListUserOrganizationsResponse> {
    return this._listUserOrganizations.execute(command);
  }

  public async generateUserToken(command: GenerateUserTokenCommand) {
    return this._generateUserToken.execute(command);
  }

  public async createInvitations(
    command: CreateInvitationsCommand,
  ): Promise<CreateInvitationsResponse> {
    return this._createInvitations.execute(command);
  }

  public async activateUserAccount(
    command: ActivateUserAccountCommand,
  ): Promise<ActivateUserAccountResponse> {
    return this._activateUserAccount.execute(command);
  }

  public async validateInvitationToken(
    command: ValidateInvitationTokenCommand,
  ): Promise<ValidateInvitationTokenResponse> {
    return this._validateInvitationToken.execute(command);
  }

  public async changeUserRole(
    command: ChangeUserRoleCommand,
  ): Promise<ChangeUserRoleResponse> {
    return this._changeUserRole.execute(command);
  }

  // API key-related use cases
  public async generateApiKey(command: GenerateApiKeyCommand) {
    if (!this._generateApiKey) {
      throw new Error(
        'API key generation not available - missing dependencies',
      );
    }
    return this._generateApiKey.execute(command);
  }

  public async getCurrentApiKey(command: GetCurrentApiKeyCommand) {
    if (!this._getCurrentApiKey) {
      throw new Error(
        'API key operations not available - missing dependencies',
      );
    }
    return this._getCurrentApiKey.execute(command);
  }

  // Password reset use cases
  public async requestPasswordReset(
    command: RequestPasswordResetCommand,
  ): Promise<RequestPasswordResetResponse> {
    return this._requestPasswordReset.execute(command);
  }

  public async resetPassword(
    command: ResetPasswordCommand,
  ): Promise<ResetPasswordResponse> {
    return this._resetPassword.execute(command);
  }

  public async validatePasswordResetToken(
    command: ValidatePasswordResetTokenCommand,
  ): Promise<ValidatePasswordResetTokenResponse> {
    return this._validatePasswordResetToken.execute(command);
  }
}
