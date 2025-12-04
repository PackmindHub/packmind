import * as fs from 'fs';
import {
  ILogoutResult,
  ILogoutUseCase,
} from '../../domain/useCases/ILogoutUseCase';
import { getCredentialsPath } from '../../infra/utils/credentials';

const ENV_VAR_NAME = 'PACKMIND_API_KEY_V3';

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
      hasEnvVar: deps?.hasEnvVar ?? (() => !!process.env[ENV_VAR_NAME]),
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
