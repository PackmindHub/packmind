import {
  IAuthGateway,
  ICommandGateway,
  IPackageGateway,
  IPackmindGateway,
  ISpaceGateway,
  IStandardGateway,
  IChangeProposalGateway,
  IDeploymentsGateway,
  IAccountsGateway,
} from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';
import { AuthGateway } from './AuthGateway';
import { SpaceGateway } from './SpaceGateway';
import { CommandGateway } from './CommandGateway';
import { PackageGateway } from './PackageGateway';
import { StandardGateway } from './StandardGateway';
import { ChangeProposalGateway } from './ChangeProposalGateway';
import { DeploymentsGateway } from './DeploymentsGateway';
import { AccountsGateway } from './AccountsGateway';

export class PackmindGateway implements IPackmindGateway {
  private httpClient?: PackmindHttpClient;
  private _auth?: IAuthGateway;
  private _accounts?: IAccountsGateway;
  private _spaces?: ISpaceGateway;
  private _commands?: ICommandGateway;
  private _packages?: IPackageGateway;
  private _standards?: IStandardGateway;
  private _changeProposals?: IChangeProposalGateway;
  private _deployments?: IDeploymentsGateway;

  constructor(
    private readonly baseUrl: string,
    apiKey?: string,
  ) {
    if (apiKey) {
      this.httpClient = new PackmindHttpClient(baseUrl, apiKey);
    }
  }

  get auth(): IAuthGateway {
    this._auth ??= new AuthGateway(this.baseUrl);
    return this._auth;
  }

  get accounts(): IAccountsGateway {
    this._accounts ??= new AccountsGateway(this.getHttpClient());
    return this._accounts;
  }

  get spaces(): ISpaceGateway {
    this._spaces ??= new SpaceGateway(this.getHttpClient());
    return this._spaces;
  }

  get commands(): ICommandGateway {
    this._commands ??= new CommandGateway(this.getHttpClient());
    return this._commands;
  }

  get packages(): IPackageGateway {
    this._packages ??= new PackageGateway(this.getHttpClient());
    return this._packages;
  }

  get standards(): IStandardGateway {
    this._standards ??= new StandardGateway(this.getHttpClient());
    return this._standards;
  }

  get changeProposals(): IChangeProposalGateway {
    this._changeProposals ??= new ChangeProposalGateway(this.getHttpClient());
    return this._changeProposals;
  }

  get deployments(): IDeploymentsGateway {
    this._deployments ??= new DeploymentsGateway(this.getHttpClient());
    return this._deployments;
  }

  /**
   * Initialize the gateway with an API key after authentication
   */
  initializeWithApiKey(apiKey: string): void {
    this.httpClient = new PackmindHttpClient(this.baseUrl, apiKey);
    // Reset lazy-initialized gateways that depend on httpClient
    this._accounts = undefined;
    this._spaces = undefined;
    this._commands = undefined;
    this._packages = undefined;
    this._standards = undefined;
    this._changeProposals = undefined;
    this._deployments = undefined;
  }

  private getHttpClient(): PackmindHttpClient {
    if (!this.httpClient) {
      throw new Error(
        'Gateway not initialized with API key. Call initializeWithApiKey first.',
      );
    }
    return this.httpClient;
  }
}
