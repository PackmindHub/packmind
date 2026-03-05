import { IPackmindGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';
import { AuthGateway } from './AuthGateway';
import { SpaceGateway } from './SpaceGateway';
import { CommandGateway } from './CommandGateway';
import { PackageGateway } from './PackageGateway';
import { DeploymentsGateway } from './DeploymentsGateway';

export class PackmindGateway implements IPackmindGateway {
  private httpClient?: PackmindHttpClient;
  private _auth?: AuthGateway;
  private _spaces?: SpaceGateway;
  private _commands?: CommandGateway;
  private _packages?: PackageGateway;
  private _deployments?: DeploymentsGateway;

  constructor(
    private readonly baseUrl: string,
    apiKey?: string,
  ) {
    if (apiKey) {
      this.httpClient = new PackmindHttpClient(baseUrl, apiKey);
    }
  }

  get auth(): AuthGateway {
    this._auth ??= new AuthGateway(this.baseUrl);
    return this._auth;
  }

  get spaces(): SpaceGateway {
    this._spaces ??= new SpaceGateway(this.getHttpClient());
    return this._spaces;
  }

  get commands(): CommandGateway {
    this._commands ??= new CommandGateway(this.getHttpClient());
    return this._commands;
  }

  get packages(): PackageGateway {
    this._packages ??= new PackageGateway(this.getHttpClient());
    return this._packages;
  }

  get deployments(): DeploymentsGateway {
    this._deployments ??= new DeploymentsGateway(this.getHttpClient());
    return this._deployments;
  }

  /**
   * Initialize the gateway with an API key after authentication
   */
  initializeWithApiKey(apiKey: string): void {
    this.httpClient = new PackmindHttpClient(this.baseUrl, apiKey);
    // Reset lazy-initialized gateways that depend on httpClient
    this._spaces = undefined;
    this._commands = undefined;
    this._packages = undefined;
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
