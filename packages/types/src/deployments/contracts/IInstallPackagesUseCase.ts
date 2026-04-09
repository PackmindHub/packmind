import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';
import { CodingAgent } from '../../coding-agent/CodingAgent';
import { PackmindLockFile } from '../PackmindLockFile';

export type InstallPackagesCommand = PackmindCommand & {
  packagesSlugs: string[];
  packmindLockFile: PackmindLockFile;
  relativePath?: string;
  agents?: CodingAgent[];
};

export type InstallPackagesResponse = {
  fileUpdates: FileUpdates;
  resolvedAgents: CodingAgent[];
  missingAccess: string[];
  skillFolders: string[];
  targetId?: string;
};

export type IInstallPackagesUseCase = IUseCase<
  InstallPackagesCommand,
  InstallPackagesResponse
>;
