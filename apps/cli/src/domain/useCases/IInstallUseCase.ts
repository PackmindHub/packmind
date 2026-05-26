import {
  CodingAgent,
  InstallPackagesResponse,
  IPublicUseCase,
} from '@packmind/types';

export type IInstallCommand = {
  baseDirectory?: string;
  packages?: string[];
  skipInstalledAt?: boolean;
  /**
   * The running CLI version, stored verbatim (including any `-next`
   * pre-release suffix) in `packmind-lock.json#cliVersion` after a
   * successful install so drift can be detected on subsequent commands.
   */
  cliVersion: string;
  /**
   * When set, the install runs in single-agent home-install mode: the locally
   * configured `agents` array is ignored, only the home agent is rendered,
   * and the agent's home directory prefix (e.g. `.claude/`) is stripped from
   * file paths so artifacts land directly under the agent's home directory.
   */
  homeAgent?: CodingAgent;
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
