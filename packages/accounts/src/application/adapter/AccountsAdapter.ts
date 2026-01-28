import { PackmindLogger } from '@packmind/logger';
import {
  IBaseAdapter,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  CheckEmailAvailabilityCommand,
  CreateCliLoginCodeCommand,
  CreateCliLoginCodeResponse,
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  CreateOrganizationCommand,
  ExchangeCliLoginCodeCommand,
  ExchangeCliLoginCodeResponse,
  GenerateApiKeyCommand,
  GenerateUserTokenCommand,
  GetCurrentApiKeyCommand,
  GetOrganizationByIdCommand,
  GetOrganizationByNameCommand,
  GetOrganizationBySlugCommand,
  GetOrganizationOnboardingStatusCommand,
  GetUserByIdCommand,
  IAccountsPort,
  IActivateUserAccountUseCase,
  IChangeUserRoleUseCase,
  ICheckEmailAvailabilityUseCase,
  ICreateCliLoginCodeUseCase,
  ICreateInvitationsUseCase,
  ICreateOrganizationUseCase,
  IDeploymentPort,
  IDeploymentPortName,
  IExchangeCliLoginCodeUseCase,
  IGenerateApiKeyUseCase,
  IGenerateUserTokenUseCase,
  IGetCurrentApiKeyUseCase,
  IGetOrganizationByIdUseCase,
  IGetOrganizationByNameUseCase,
  IGetOrganizationBySlugUseCase,
  IGetOrganizationOnboardingStatusUseCase,
  IGetUserByIdUseCase,
  IGitPort,
  IGitPortName,
  IListOrganizationUserStatusesUseCase,
  IListOrganizationUsersUseCase,
  IListUserOrganizationsUseCase,
  IRenameOrganizationUseCase,
  IRequestPasswordResetUseCase,
  IResetPasswordUseCase,
  ISignInUserUseCase,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  IStartTrial,
  IGenerateTrialActivationTokenUseCase,
  GenerateTrialActivationTokenCommand,
  GenerateTrialActivationTokenResult,
  IActivateTrialAccountUseCase,
  ActivateTrialAccountCommand,
  ActivateTrialAccountResult,
  IValidateInvitationTokenUseCase,
  IValidatePasswordResetTokenUseCase,
  IValidatePasswordUseCase,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse,
  ListUserOrganizationsCommand,
  ListUserOrganizationsResponse,
  Organization,
  OrganizationId,
  OrganizationOnboardingStatus,
  RenameOrganizationCommand,
  RenameOrganizationResponse,
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  ResetPasswordCommand,
  ResetPasswordResponse,
  SignInUserCommand,
  StartTrialCommand,
  StartTrialResult,
  User,
  UserId,
  ValidateInvitationTokenCommand,
  ValidateInvitationTokenResponse,
  ValidatePasswordCommand,
  ValidatePasswordResetTokenCommand,
  ValidatePasswordResetTokenResponse,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import {
  IRemoveUserFromOrganizationUseCase,
  ISignUpWithOrganizationUseCase,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
  SignUpWithOrganizationCommand,
} from '../../domain/useCases';
import { RenameOrganizationUseCase } from '../useCases/renameOrganization/RenameOrganizationUseCase';
import { GenerateTrialActivationTokenUseCase } from '../useCases/generateTrialActivationToken/GenerateTrialActivationTokenUseCase';
import { ActivateTrialAccountUseCase } from '../useCases/activateTrialAccount/ActivateTrialAccountUseCase';
import { EnhancedAccountsServices } from '../services/EnhancedAccountsServices';
import { RequestPasswordResetUseCase } from '../useCases/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../useCases/ResetPasswordUseCase';
import { ValidatePasswordResetTokenUseCase } from '../useCases/ValidatePasswordResetTokenUseCase';
import { ActivateUserAccountUseCase } from '../useCases/activateUserAccount/ActivateUserAccountUseCase';
import { ChangeUserRoleUseCase } from '../useCases/changeUserRole/ChangeUserRoleUseCase';
import { CheckEmailAvailabilityUseCase } from '../useCases/checkEmailAvailability/CheckEmailAvailabilityUseCase';
import { CreateCliLoginCodeUseCase } from '../useCases/createCliLoginCode/CreateCliLoginCodeUseCase';
import { CreateInvitationsUseCase } from '../useCases/createInvitations/CreateInvitationsUseCase';
import { ExchangeCliLoginCodeUseCase } from '../useCases/exchangeCliLoginCode/ExchangeCliLoginCodeUseCase';
import { CreateOrganizationUseCase } from '../useCases/createOrganization/CreateOrganizationUseCase';
import { GenerateApiKeyUseCase } from '../useCases/generateApiKey/GenerateApiKeyUseCase';
import { GenerateUserTokenUseCase } from '../useCases/generateUserToken/GenerateUserTokenUseCase';
import { GetCurrentApiKeyUseCase } from '../useCases/getCurrentApiKey/GetCurrentApiKeyUseCase';
import { GetOrganizationByIdUseCase } from '../useCases/getOrganizationById/GetOrganizationByIdUseCase';
import { GetOrganizationByNameUseCase } from '../useCases/getOrganizationByName/GetOrganizationByNameUseCase';
import { GetOrganizationBySlugUseCase } from '../useCases/getOrganizationBySlug/GetOrganizationBySlugUseCase';
import { GetOrganizationOnboardingStatusUseCase } from '../useCases/getOrganizationOnboardingStatus/GetOrganizationOnboardingStatusUseCase';
import { GetUserByIdUseCase } from '../useCases/getUserById/GetUserByIdUseCase';
import { ListOrganizationUserStatusesUseCase } from '../useCases/listOrganizationUserStatuses/ListOrganizationUserStatusesUseCase';
import { ListOrganizationUsersUseCase } from '../useCases/listOrganizationUsers/ListOrganizationUsersUseCase';
import { ListUserOrganizationsUseCase } from '../useCases/listUserOrganizations/ListUserOrganizationsUseCase';
import { RemoveUserFromOrganizationUseCase } from '../useCases/removeUserFromOrganization/RemoveUserFromOrganizationUseCase';
import { SignInUserUseCase } from '../useCases/signInUser/SignInUserUseCase';
import { SignUpWithOrganizationUseCase } from '../useCases/signUpWithOrganization/SignUpWithOrganizationUseCase';
import { ValidateInvitationTokenUseCase } from '../useCases/validateInvitationToken/ValidateInvitationTokenUseCase';
import { ValidatePasswordUseCase } from '../useCases/validatePasswordUseCase/ValidatePasswordUseCase';
import { StartTrialUseCase } from '../useCases/startTrial/StartTrialUseCase';

const origin = 'AccountsAdapter';

export class AccountsAdapter
  implements IBaseAdapter<IAccountsPort>, IAccountsPort
{
  private spacesPort: ISpacesPort | null = null;
  private gitPort: IGitPort | null = null;
  private standardsPort: IStandardsPort | null = null;
  private deploymentPort: IDeploymentPort | null = null;

  private _signUpWithOrganization!: ISignUpWithOrganizationUseCase;
  private _signInUser!: ISignInUserUseCase;
  private _getUserById!: IGetUserByIdUseCase;
  private _removeUserFromOrganization!: IRemoveUserFromOrganizationUseCase;
  private _listOrganizationUserStatuses!: IListOrganizationUserStatusesUseCase;
  private _listOrganizationUsers!: IListOrganizationUsersUseCase;
  private _validatePassword!: IValidatePasswordUseCase;
  private _createOrganization!: ICreateOrganizationUseCase;
  private _getOrganizationById!: IGetOrganizationByIdUseCase;
  private _getOrganizationByName!: IGetOrganizationByNameUseCase;
  private _getOrganizationBySlug!: IGetOrganizationBySlugUseCase;
  private _generateUserToken!: IGenerateUserTokenUseCase;
  private _createInvitations!: ICreateInvitationsUseCase;
  private _activateUserAccount!: IActivateUserAccountUseCase;
  private _validateInvitationToken!: IValidateInvitationTokenUseCase;
  private _generateApiKey?: IGenerateApiKeyUseCase;
  private _getCurrentApiKey?: IGetCurrentApiKeyUseCase;
  private _checkEmailAvailability!: ICheckEmailAvailabilityUseCase;
  private _changeUserRole!: IChangeUserRoleUseCase;
  private _renameOrganization!: IRenameOrganizationUseCase;
  private _listUserOrganizations!: IListUserOrganizationsUseCase;
  private _requestPasswordReset!: IRequestPasswordResetUseCase;
  private _resetPassword!: IResetPasswordUseCase;
  private _validatePasswordResetToken!: IValidatePasswordResetTokenUseCase;
  private _getOrganizationOnboardingStatus!: IGetOrganizationOnboardingStatusUseCase;
  private _createCliLoginCode?: ICreateCliLoginCodeUseCase;
  private _exchangeCliLoginCode?: IExchangeCliLoginCodeUseCase;
  private _startTrial!: IStartTrial;
  private _generateTrialActivationToken!: IGenerateTrialActivationTokenUseCase;
  private _activateTrialAccount!: IActivateTrialAccountUseCase;

  constructor(
    private readonly accountsServices: EnhancedAccountsServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('AccountsAdapter constructed - awaiting initialization');
  }

  /**
   * Initialize adapter with optional ports from registry.
   * All ports are optional - adapter can function without any of them.
   */
  public async initialize(ports: {
    [ISpacesPortName]: ISpacesPort;
    [IGitPortName]: IGitPort;
    [IStandardsPortName]: IStandardsPort;
    [IDeploymentPortName]: IDeploymentPort;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    this.logger.info('Initializing AccountsAdapter with optional ports');

    // Set all optional ports
    this.spacesPort = ports[ISpacesPortName];
    this.gitPort = ports[IGitPortName];
    this.standardsPort = ports[IStandardsPortName];
    this.deploymentPort = ports[IDeploymentPortName];

    if (
      !this.spacesPort ||
      !this.gitPort ||
      !this.standardsPort ||
      !this.deploymentPort
    ) {
      throw new Error('Required ports are missing');
    }

    // Create all use cases with ports
    this._signUpWithOrganization = new SignUpWithOrganizationUseCase(
      this.accountsServices.getUserService(),
      this.accountsServices.getOrganizationService(),
      ports.eventEmitterService,
      this.logger,
      this.spacesPort,
    );
    this._signInUser = new SignInUserUseCase(
      this.accountsServices.getUserService(),
      this.accountsServices.getOrganizationService(),
      this.accountsServices.getLoginRateLimiterService(),
    );
    this._getUserById = new GetUserByIdUseCase(
      this.accountsServices.getUserService(),
    );
    this._removeUserFromOrganization = new RemoveUserFromOrganizationUseCase(
      this,
      this.accountsServices.getUserService(),
      this.logger,
    );
    this._listOrganizationUserStatuses =
      new ListOrganizationUserStatusesUseCase(
        this,
        this.accountsServices.getUserService(),
        this.accountsServices.getInvitationService(),
        this.logger,
      );
    this._listOrganizationUsers = new ListOrganizationUsersUseCase(
      this,
      this.accountsServices.getUserService(),
      this.logger,
    );
    this._validatePassword = new ValidatePasswordUseCase(
      this.accountsServices.getUserService(),
    );
    this._createOrganization = new CreateOrganizationUseCase(
      this.accountsServices.getOrganizationService(),
      this.accountsServices.getUserService(),
      ports.eventEmitterService,
      this.logger,
      this.spacesPort,
    );
    this._getOrganizationById = new GetOrganizationByIdUseCase(
      this.accountsServices.getOrganizationService(),
    );
    this._getOrganizationByName = new GetOrganizationByNameUseCase(
      this.accountsServices.getOrganizationService(),
    );
    this._getOrganizationBySlug = new GetOrganizationBySlugUseCase(
      this.accountsServices.getOrganizationService(),
    );
    this._generateUserToken = new GenerateUserTokenUseCase(
      this.accountsServices.getUserService(),
      this.accountsServices.getOrganizationService(),
    );
    this._checkEmailAvailability = new CheckEmailAvailabilityUseCase(
      this.accountsServices.getUserService(),
    );
    this._listUserOrganizations = new ListUserOrganizationsUseCase(
      this.accountsServices.getUserService(),
    );
    this._createInvitations = new CreateInvitationsUseCase(
      this,
      this.accountsServices.getUserService(),
      this.accountsServices.getInvitationService(),
      this.logger,
    );
    this._activateUserAccount = new ActivateUserAccountUseCase(
      this.accountsServices.getUserService(),
      this.accountsServices.getInvitationService(),
      ports.eventEmitterService,
      this.logger,
    );
    this._validateInvitationToken = new ValidateInvitationTokenUseCase(
      this.accountsServices.getInvitationService(),
      this.accountsServices.getUserService(),
      this.logger,
    );
    this._changeUserRole = new ChangeUserRoleUseCase(
      this,
      this.accountsServices.getUserService(),
      this.logger,
    );
    this._renameOrganization = new RenameOrganizationUseCase(
      this,
      this.accountsServices.getOrganizationService(),
      this.logger,
    );
    this._requestPasswordReset = new RequestPasswordResetUseCase(
      this.accountsServices.getUserService(),
      this.accountsServices.getPasswordResetTokenService(),
      this.logger,
    );
    this._resetPassword = new ResetPasswordUseCase(
      this.accountsServices.getUserService(),
      this.accountsServices.getPasswordResetTokenService(),
      this.accountsServices.getLoginRateLimiterService(),
      this.logger,
    );
    this._validatePasswordResetToken = new ValidatePasswordResetTokenUseCase(
      this.accountsServices.getPasswordResetTokenService(),
      this.accountsServices.getUserService(),
      this.logger,
    );
    this._getOrganizationOnboardingStatus =
      new GetOrganizationOnboardingStatusUseCase(
        this,
        this.accountsServices.getUserService(),
        this.gitPort ?? null,
        this.standardsPort ?? null,
        this.spacesPort ?? null,
        this.deploymentPort ?? null,
        this.logger,
      );

    // API key use cases are optional since they require additional dependencies
    const apiKeyService = this.accountsServices.getApiKeyService?.();
    if (apiKeyService) {
      this._generateApiKey = new GenerateApiKeyUseCase(
        this.accountsServices.getUserService(),
        this.accountsServices.getOrganizationService(),
        apiKeyService,
        this.logger,
      );
      this._getCurrentApiKey = new GetCurrentApiKeyUseCase(this.logger);
      this.logger.debug('API key use cases initialized');

      // CLI login use cases require API key service
      this._createCliLoginCode = new CreateCliLoginCodeUseCase(
        this.accountsServices.getCliLoginCodeRepository(),
        this.logger,
      );
      this._exchangeCliLoginCode = new ExchangeCliLoginCodeUseCase(
        this.accountsServices.getCliLoginCodeRepository(),
        this.accountsServices.getUserService(),
        this.accountsServices.getOrganizationService(),
        apiKeyService,
        this.logger,
      );
      this.logger.debug('CLI login use cases initialized');
    } else {
      this.logger.debug('API key use cases skipped - service not available');
    }

    // Trial use case
    this._startTrial = new StartTrialUseCase(
      this.accountsServices.getUserService(),
      this.accountsServices.getOrganizationService(),
      ports.eventEmitterService,
      this.logger,
      this.spacesPort ?? undefined,
      this.deploymentPort ?? undefined,
    );
    this.logger.debug('Start trial use case initialized');

    // Trial activation token use case (requires TrialActivationService)
    const trialActivationService =
      this.accountsServices.getTrialActivationService?.();
    if (trialActivationService) {
      this._generateTrialActivationToken =
        new GenerateTrialActivationTokenUseCase(
          this,
          trialActivationService,
          this.logger,
        );
      this.logger.debug('Generate trial activation token use case initialized');

      this._activateTrialAccount = new ActivateTrialAccountUseCase(
        trialActivationService,
        this.accountsServices.getUserService(),
        this.accountsServices.getOrganizationService(),
        ports.eventEmitterService,
        this.logger,
      );
      this.logger.debug('Activate trial account use case initialized');
    }

    this.logger.info('AccountsAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready.
   * AccountsAdapter is always ready since all ports are optional.
   */
  public isReady(): boolean {
    return (
      this.gitPort !== null &&
      this.spacesPort !== null &&
      this.standardsPort !== null &&
      this.deploymentPort !== null
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): IAccountsPort {
    return this;
  }

  // User-related use cases
  public async signUpWithOrganization(command: SignUpWithOrganizationCommand) {
    return this._signUpWithOrganization.execute(command);
  }

  public async signInUser(command: SignInUserCommand) {
    return this._signInUser.execute(command);
  }

  // Method overloads for getUserById
  public async getUserById(command: GetUserByIdCommand): Promise<User | null>;
  public async getUserById(userId: UserId): Promise<User | null>;
  public async getUserById(
    commandOrUserId: GetUserByIdCommand | UserId,
  ): Promise<User | null> {
    const command: GetUserByIdCommand =
      typeof commandOrUserId === 'object' && commandOrUserId !== null
        ? commandOrUserId
        : { userId: createUserId(commandOrUserId as string) };
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

  // Method overloads for getOrganizationById
  public async getOrganizationById(
    command: GetOrganizationByIdCommand,
  ): Promise<Organization | null>;
  public async getOrganizationById(
    organizationId: OrganizationId,
  ): Promise<Organization | null>;
  public async getOrganizationById(
    commandOrOrganizationId: GetOrganizationByIdCommand | OrganizationId,
  ): Promise<Organization | null> {
    const command: GetOrganizationByIdCommand =
      typeof commandOrOrganizationId === 'object' &&
      commandOrOrganizationId !== null
        ? commandOrOrganizationId
        : {
            organizationId: createOrganizationId(
              commandOrOrganizationId as string,
            ),
          };
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

  public async renameOrganization(
    command: RenameOrganizationCommand,
  ): Promise<RenameOrganizationResponse> {
    return this._renameOrganization.execute(command);
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

  public async getOrganizationOnboardingStatus(
    command: GetOrganizationOnboardingStatusCommand,
  ): Promise<OrganizationOnboardingStatus> {
    return this._getOrganizationOnboardingStatus.execute(command);
  }

  // CLI login use cases
  public async createCliLoginCode(
    command: CreateCliLoginCodeCommand,
  ): Promise<CreateCliLoginCodeResponse> {
    if (!this._createCliLoginCode) {
      throw new Error(
        'CLI login code creation not available - missing dependencies',
      );
    }
    return this._createCliLoginCode.execute(command);
  }

  public async exchangeCliLoginCode(
    command: ExchangeCliLoginCodeCommand,
  ): Promise<ExchangeCliLoginCodeResponse> {
    if (!this._exchangeCliLoginCode) {
      throw new Error(
        'CLI login code exchange not available - missing dependencies',
      );
    }
    return this._exchangeCliLoginCode.execute(command);
  }

  // Trial use cases
  public async startTrial(
    command: StartTrialCommand,
  ): Promise<StartTrialResult> {
    return this._startTrial.execute(command);
  }

  public async generateTrialActivationToken(
    command: GenerateTrialActivationTokenCommand,
  ): Promise<GenerateTrialActivationTokenResult> {
    if (!this._generateTrialActivationToken) {
      throw new Error(
        'Trial activation token generation not available - missing dependencies',
      );
    }
    return this._generateTrialActivationToken.execute(command);
  }

  public async activateTrialAccount(
    command: ActivateTrialAccountCommand,
  ): Promise<ActivateTrialAccountResult> {
    if (!this._activateTrialAccount) {
      throw new Error(
        'Trial account activation not available - missing dependencies',
      );
    }
    return this._activateTrialAccount.execute(command);
  }
}
