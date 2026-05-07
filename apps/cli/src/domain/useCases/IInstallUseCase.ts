import { CodingAgent, IPublicUseCase } from '@packmind/types';

export type IInstallCommand = {
  baseDirectory?: string;
  packages?: string[];
  skipInstalledAt?: boolean;
};

export type IInstallResult = {
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
  missingAccess: string[];
  joinSpaceUrl?: string;
  configCreated: boolean;
  packagesAdded: string[];
  sourceArtifacts: {
    skillsCount: number;
    standardsCount: number;
    commandsCount: number;
    recipesCount: number;
  };
  resolvedAgents: CodingAgent[];
};

export type IInstallUseCase = IPublicUseCase<IInstallCommand, IInstallResult>;
