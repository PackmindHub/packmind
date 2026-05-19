import * as fs from 'fs';
import {
  ILogoutResult,
  ILogoutUseCase,
} from '../../domain/useCases/ILogoutUseCase';
import { getCredentialsPath } from '../../infra/utils/credentials';
import { ENV_VAR_NAMES } from '../../infra/utils/credentials/EnvCredentialsProvider';

export interface ILogoutDependencies {
  getCredentialsPath: () => string;
  fileExists: (path: string) => boolean;
  deleteFile: (path: string) => void;
  hasEnvVar: () => boolean;
}

export class LogoutUseCase implements ILogoutUseCase {
  private readonly deps: ILogoutDependencies;

  constructor(deps?: Partial<ILogoutDependencies>) {
    this.deps = {
      getCredentialsPath: deps?.getCredentialsPath ?? getCredentialsPath,
      fileExists: deps?.fileExists ?? ((path) => fs.existsSync(path)),
      deleteFile: deps?.deleteFile ?? ((path) => fs.unlinkSync(path)),
      hasEnvVar:
        deps?.hasEnvVar ??
        (() =>
          ENV_VAR_NAMES.some((name) => {
            const value = process.env[name];
            return !!value && value.trim().length > 0;
          })),
    };
  }

  async execute(): Promise<ILogoutResult> {
    const credentialsPath = this.deps.getCredentialsPath();
    const hadCredentialsFile = this.deps.fileExists(credentialsPath);
    const hasEnvVar = this.deps.hasEnvVar();

    if (hadCredentialsFile) {
      this.deps.deleteFile(credentialsPath);
    }

    return {
      hadCredentialsFile,
      hasEnvVar,
      credentialsPath,
    };
  }
}
