import {
  ArtifactType,
  CodingAgent,
  MultiFileCodingAgent,
} from '@packmind/types';

export type PackmindLockFileFile = {
  path: string;
  agent: MultiFileCodingAgent;
  isSkillDefinition?: boolean;
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
  agents: CodingAgent[];
  installedAt: string;
  cliVersion: string;
  targetId?: string;
  artifacts: Record<string, PackmindLockFileEntry>;
};
