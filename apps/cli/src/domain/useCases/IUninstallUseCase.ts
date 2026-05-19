import { IInstallResult } from './IInstallUseCase';

export type IUninstallCommand = {
  baseDirectory?: string;
  packages: string[];
  /**
   * The running CLI version, propagated to the underlying install run so the
   * lockfile keeps tracking the version that last mutated the workspace.
   */
  cliVersion: string;
};

export type IUninstallResult = IInstallResult;

export interface IUninstallUseCase {
  execute(command: IUninstallCommand): Promise<IUninstallResult>;
}
