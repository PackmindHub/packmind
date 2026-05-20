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
  /**
   * Version of the Packmind CLI that last synchronized this workspace.
   * Stored verbatim (including any pre-release suffix such as `-next`).
   * Optional for backward compatibility with lockfiles produced by older
   * CLI versions that did not record this information.
   */
  cliVersion?: string;
  packageSlugs: string[];
  agents: CodingAgent[];
  installedAt?: string;
  targetId?: string;
  artifacts: Record<string, PackmindLockFileEntry>;
};
