import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';
import { CodingAgent } from '../../coding-agent/CodingAgent';
import { PackmindLockFile } from '../PackmindLockFile';

export type InstallPackagesCommand = PackmindCommand & {
  packagesSlugs: string[];
  /**
   * Which version each slug asks for — `*` or an exact `X.Y.Z` — keyed by the
   * slug exactly as it appears in `packagesSlugs`.
   *
   * Absent entirely means every slug tracks the live package, which is what a
   * CLI released before pinning meant. Present, a slug it does not mention
   * names no version, and the newest release answers.
   */
  packageVersions?: Record<string, string>;
  packmindLockFile: PackmindLockFile;
  relativePath?: string;
  agents?: CodingAgent[];
};

export type InstallPackagesResponse = {
  fileUpdates: FileUpdates;
  resolvedAgents: CodingAgent[];
  missingAccess: string[];
  skillFolders: string[];
  /**
   * What each package resolved to, keyed by normalized `@space/package` slug:
   * an exact `X.Y.Z` for a rendered release, `*` for the live package. The CLI
   * writes these back into `packmind.json`.
   */
  resolvedPackageVersions?: Record<string, string>;
  targetId?: string;
  sourceArtifacts: {
    skillsCount: number;
    standardsCount: number;
    commandsCount: number;
    recipesCount: number;
  };
};

export type IInstallPackagesUseCase = IUseCase<
  InstallPackagesCommand,
  InstallPackagesResponse
>;
