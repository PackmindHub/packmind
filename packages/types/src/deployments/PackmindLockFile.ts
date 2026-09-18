import { ArtifactType } from './FileUpdates';
import { CodingAgent } from '../coding-agent/CodingAgent';
import { MultiFileCodingAgent } from '../coding-agent/CodingAgentArtefactPaths';

export type PackmindLockFileFile = {
  path: string;
  agent: MultiFileCodingAgent;
  isSkillDefinition?: boolean;
};

/**
 * Discriminator for the origin of a lockfile entry.
 *
 * - `'default'` — a built-in default skill shipped by the CLI server (e.g. the
 *   skills emitted by `DefaultSkillsDeployer`).
 * - `'user'` — anything else: user-authored skills as well as
 *   package-distributed standards, commands, and skills.
 *
 * The `source` value is part of the `artifacts` map key
 * (`${source}:${type}:${slug}`) so default and user entries cannot collide
 * even when their slugs match.
 */
export type PackmindLockFileEntrySource = 'default' | 'user';

export type PackmindLockFileEntry = {
  name: string;
  type: ArtifactType;
  id: string;
  version: number;
  spaceId: string;
  packageIds: string[];
  files: PackmindLockFileFile[];
  /** Required as of `lockfileVersion: 2`. */
  source: PackmindLockFileEntrySource;
};

/**
 * Lockfile shape persisted at `<workspace>/packmind-lock.json`.
 *
 * Map key format for `artifacts`:
 *   `${source}:${type}:${slug}` (e.g. `'default:skill:create-skill'`,
 *   `'user:skill:my-custom-skill'`, `'user:standard:typescript-good-practices'`).
 *
 * The current `lockfileVersion` is `2`. Versions `0` and `1` (the predecessor
 * format, with `${type}:${slug}` keys and no `source` field on entries) are
 * still accepted by `LockFileRepository.read` and migrated to v2 in memory; the
 * on-disk file is only rewritten on the next mutating command.
 */
export type PackmindLockFile = {
  lockfileVersion: number;
  /**
   * Version of the Packmind CLI that last synchronized this workspace, stored
   * verbatim including any pre-release suffix such as `-next`. Optional because
   * older CLI versions did not record it.
   */
  cliVersion?: string;
  packageSlugs: string[];
  agents: CodingAgent[];
  targetId?: string;
  artifacts: Record<string, PackmindLockFileEntry>;
};
