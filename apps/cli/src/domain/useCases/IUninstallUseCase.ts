import { IInstallResult } from './IInstallUseCase';

export type IUninstallCommand = {
  baseDirectory?: string;
  packages: string[];
};

export type IUninstallResult = IInstallResult;

export interface IUninstallUseCase {
  execute(command: IUninstallCommand): Promise<IUninstallResult>;
}
