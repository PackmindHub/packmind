import { IPublicUseCase } from '@packmind/types';

export type IInstallPackagesCommand = {
  baseDirectory?: string; // Directory where files should be created (defaults to current working directory)
  packagesSlugs: string[]; // Package slugs to pull content from
  previousPackagesSlugs?: string[]; // Previously installed packages for change detection
  // Git target info for distribution history lookup (to detect skills removed from packages)
  gitRemoteUrl?: string;
  gitBranch?: string;
  relativePath?: string;
};

export type IInstallPackagesResult = {
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  errors: string[];
  recipesCount: number;
  standardsCount: number;
  skillsCount: number;
  skillDirectoriesDeleted: number;
};

export type IInstallPackagesUseCase = IPublicUseCase<
  IInstallPackagesCommand,
  IInstallPackagesResult
>;
