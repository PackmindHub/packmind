import { InstallPackagesResponse, IPublicUseCase } from '@packmind/types';

export type IInstallCommand = {
  baseDirectory?: string;
  packages?: string[];
  skipInstalledAt?: boolean;
};

export type IInstallResult = Pick<
  InstallPackagesResponse,
  'sourceArtifacts' | 'resolvedAgents' | 'missingAccess'
> & {
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  contentFilesChanged: number;
  errors: string[];
  recipesCount: number;
  standardsCount: number;
  commandsCount: number;
  skillsCount: number;
  recipesRemoved: number;
  standardsRemoved: number;
  commandsRemoved: number;
  skillsRemoved: number;
  skillDirectoriesDeleted: number;
  joinSpaceUrl?: string;
  configCreated: boolean;
  packagesAdded: string[];
};

export type IInstallUseCase = IPublicUseCase<IInstallCommand, IInstallResult>;
