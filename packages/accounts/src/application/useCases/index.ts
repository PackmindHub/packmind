import { SignUpUserUseCase } from './signUpUser/signUpUser.usecase';
import { SignInUserUseCase } from './signInUser/SignInUserUseCase';
import { GetUserByIdUseCase } from './getUserById/GetUserByIdUseCase';
import { ListUsersUseCase } from './listUsers/ListUsersUseCase';
import { ValidatePasswordUseCase } from './validatePasswordUseCase/ValidatePasswordUseCase';
import { CreateOrganizationUseCase } from './createOrganization/CreateOrganizationUseCase';
import { GetOrganizationByIdUseCase } from './getOrganizationById/GetOrganizationByIdUseCase';
import { GetOrganizationByNameUseCase } from './getOrganizationByName/GetOrganizationByNameUseCase';
import { GetOrganizationBySlugUseCase } from './getOrganizationBySlug/GetOrganizationBySlugUseCase';
import { ListOrganizationsUseCase } from './listOrganizations/ListOrganizationsUseCase';
import { GenerateUserTokenUseCase } from './generateUserToken/GenerateUserTokenUseCase';
import { GenerateApiKeyUseCase } from './generateApiKey/GenerateApiKeyUseCase';
import { GetCurrentApiKeyUseCase } from './getCurrentApiKey/GetCurrentApiKeyUseCase';
import { IAccountsServices } from '../IAccountsServices';
import { PackmindLogger } from '@packmind/shared';

import {
  ISignUpUserUseCase,
  ISignInUserUseCase,
  IGetUserByIdUseCase,
  IListUsersUseCase,
  IValidatePasswordUseCase,
  ICreateOrganizationUseCase,
  IGetOrganizationByIdUseCase,
  IGetOrganizationByNameUseCase,
  IGetOrganizationBySlugUseCase,
  IListOrganizationsUseCase,
  IGenerateUserTokenUseCase,
  IGenerateApiKeyUseCase,
  IGetCurrentApiKeyUseCase,
  SignUpUserCommand,
  SignInUserCommand,
  GetUserByIdCommand,
  ListUsersCommand,
  ValidatePasswordCommand,
  CreateOrganizationCommand,
  GetOrganizationByIdCommand,
  GetOrganizationBySlugCommand,
  ListOrganizationsCommand,
  GenerateUserTokenCommand,
  GenerateApiKeyCommand,
  GetCurrentApiKeyCommand,
} from '../../domain/useCases';
import { GetOrganizationByNameCommand } from '../../domain/useCases/IGetOrganizationByNameUseCase';

const origin = 'AccountsUseCases';

export class AccountsUseCases {
  private readonly _signUpUser: ISignUpUserUseCase;
  private readonly _signInUser: ISignInUserUseCase;
  private readonly _getUserById: IGetUserByIdUseCase;
  private readonly _listUsers: IListUsersUseCase;
  private readonly _validatePassword: IValidatePasswordUseCase;
  private readonly _createOrganization: ICreateOrganizationUseCase;
  private readonly _getOrganizationById: IGetOrganizationByIdUseCase;
  private readonly _getOrganizationByName: IGetOrganizationByNameUseCase;
  private readonly _getOrganizationBySlug: IGetOrganizationBySlugUseCase;
  private readonly _listOrganizations: IListOrganizationsUseCase;
  private readonly _generateUserToken: IGenerateUserTokenUseCase;
  private readonly _generateApiKey?: IGenerateApiKeyUseCase;
  private readonly _getCurrentApiKey?: IGetCurrentApiKeyUseCase;

  constructor(
    private readonly accountsServices: IAccountsServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._signUpUser = new SignUpUserUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
    );
    this._signInUser = new SignInUserUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
    );
    this._getUserById = new GetUserByIdUseCase(
      accountsServices.getUserService(),
    );
    this._listUsers = new ListUsersUseCase(accountsServices.getUserService());
    this._validatePassword = new ValidatePasswordUseCase(
      accountsServices.getUserService(),
    );
    this._createOrganization = new CreateOrganizationUseCase(
      accountsServices.getOrganizationService(),
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
    this._listOrganizations = new ListOrganizationsUseCase(
      accountsServices.getOrganizationService(),
    );
    this._generateUserToken = new GenerateUserTokenUseCase(
      accountsServices.getUserService(),
      accountsServices.getOrganizationService(),
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
  public async signUpUser(command: SignUpUserCommand) {
    return this._signUpUser.execute(command);
  }

  public async signInUser(command: SignInUserCommand) {
    return this._signInUser.execute(command);
  }

  public async getUserById(command: GetUserByIdCommand) {
    const result = await this._getUserById.execute(command);
    return result.user;
  }

  public async listUsers(command: ListUsersCommand) {
    return await this._listUsers.execute(command);
  }

  public async validatePassword(command: ValidatePasswordCommand) {
    const result = await this._validatePassword.execute(command);
    return result.isValid;
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

  public async listOrganizations(command: ListOrganizationsCommand) {
    const result = await this._listOrganizations.execute(command);
    return result.organizations;
  }

  public async generateUserToken(command: GenerateUserTokenCommand) {
    return this._generateUserToken.execute(command);
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
}
