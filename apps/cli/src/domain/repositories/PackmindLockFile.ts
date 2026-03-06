import { ArtifactType } from '@packmind/types';

export type PackmindLockFileEntry = {
  name: string;
  type: ArtifactType;
  id: string;
  version: number;
  spaceId: string;
};

export type PackmindLockFile = {
  lockfileVersion: 1;
  artifacts: PackmindLockFileEntry[];
};
