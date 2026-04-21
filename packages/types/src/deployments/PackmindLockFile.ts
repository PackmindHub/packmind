import { ArtifactType } from './FileUpdates';
import { CodingAgent } from '../coding-agent/CodingAgent';
import { MultiFileCodingAgent } from '../coding-agent/CodingAgentArtefactPaths';

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
  packageIds: string[];
  files: PackmindLockFileFile[];
};

export type PackmindLockFile = {
  lockfileVersion: number;
  packageSlugs: string[];
  agents: CodingAgent[];
  targetId?: string;
  artifacts: Record<string, PackmindLockFileEntry>;
};
