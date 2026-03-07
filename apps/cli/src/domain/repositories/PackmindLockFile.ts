import { ArtifactType, MultiFileCodingAgent } from '@packmind/types';

export type PackmindLockFileFile = {
  path: string;
  agent: MultiFileCodingAgent;
};

export type PackmindLockFileEntry = {
  name: string;
  type: ArtifactType;
  id: string;
  version: number;
  spaceId: string;
  files: PackmindLockFileFile[];
};

export type PackmindLockFile = {
  lockfileVersion: 1;
  packageSlugs: string[];
  installedAt: string;
  cliVersion: string;
  artifacts: Record<string, PackmindLockFileEntry>;
};
