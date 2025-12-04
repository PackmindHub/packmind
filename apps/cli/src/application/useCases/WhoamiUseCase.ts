import {
  IWhoamiResult,
  IWhoamiUseCase,
} from '../../domain/useCases/IWhoamiUseCase';
import {
  loadCredentials,
  getCredentialsPath,
  CredentialsResult,
} from '../../infra/utils/credentials';

export interface IWhoamiDependencies {
  loadCredentials: () => CredentialsResult | null;
  getCredentialsPath: () => string;
}

export class WhoamiUseCase implements IWhoamiUseCase {
  private readonly deps: IWhoamiDependencies;

  constructor(deps?: Partial<IWhoamiDependencies>) {
    this.deps = {
      loadCredentials: deps?.loadCredentials ?? loadCredentials,
      getCredentialsPath: deps?.getCredentialsPath ?? getCredentialsPath,
    };
  }

  async execute(): Promise<IWhoamiResult> {
    const credentials = this.deps.loadCredentials();
    const credentialsPath = this.deps.getCredentialsPath();

    if (!credentials) {
      return {
        isAuthenticated: false,
        credentialsPath,
      };
    }

    return {
      isAuthenticated: true,
      host: credentials.host,
      source: credentials.source,
      organizationName: credentials.organizationName,
      userName: credentials.userName,
      expiresAt: credentials.expiresAt,
      isExpired: credentials.isExpired,
      credentialsPath,
    };
  }
}
