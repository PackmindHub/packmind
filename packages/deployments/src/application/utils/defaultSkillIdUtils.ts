import { v4 as uuidv4 } from 'uuid';

// Default skills are not persisted as DB rows, but their lockfile id must still
// be a UUID because the content-by-versions endpoint queries a uuid-typed
// column. We memoize per process so that the synthetic skillId emitted by
// DeployDefaultSkillsUseCase and the artifactId stamped by
// DefaultSkillsMetadataEnricher resolve to the same UUID for the same slug —
// PackmindLockFileService.buildVersionLookup relies on that equality to match
// FileModification entries to their VersionInfo.

const skillIdBySlug = new Map<string, string>();
const skillVersionIdByKey = new Map<string, string>();
let defaultSkillAuthorUserId: string | null = null;

export function getDefaultSkillId(slug: string): string {
  const existing = skillIdBySlug.get(slug);
  if (existing) {
    return existing;
  }
  const id = uuidv4();
  skillIdBySlug.set(slug, id);
  return id;
}

export function getDefaultSkillVersionId(
  slug: string,
  version: number,
): string {
  const key = `${slug}:${version}`;
  const existing = skillVersionIdByKey.get(key);
  if (existing) {
    return existing;
  }
  const id = uuidv4();
  skillVersionIdByKey.set(key, id);
  return id;
}

export function getDefaultSkillAuthorUserId(): string {
  if (defaultSkillAuthorUserId === null) {
    defaultSkillAuthorUserId = uuidv4();
  }
  return defaultSkillAuthorUserId;
}
