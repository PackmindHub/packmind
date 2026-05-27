import { v4 as uuidv4 } from 'uuid';

// Default skills are not persisted as DB rows, but their lockfile id must still
// be a UUID because the content-by-versions endpoint queries a uuid-typed
// column. The slug → uuid mapping is frozen here (one literal uuidv4 per known
// slug) so the lockfile entry id stays stable across API restarts, pod
// replicas, and environments. Add a new entry when DefaultSkillsDeployer gains
// a new default skill — getDefaultSkillId throws on unknown slugs to force the
// update.
const DEFAULT_SKILL_IDS: Readonly<Record<string, string>> = Object.freeze({
  'packmind-create-skill': '2b774ab0-58eb-4e02-8e92-bc52d31eafa6',
  'packmind-create-standard': '7f7fa767-8807-4dbf-8a05-9266c74e47dd',
  'packmind-onboard': '0c808e08-70e8-402c-a60e-c38e9076e391',
  'packmind-create-command': 'fdbf78e3-49c3-4019-ac9c-baa18e85728c',
  'packmind-create-package': '8e9b9e9c-65ab-438f-bbbb-e3c5a625c625',
  'packmind-cli-list-commands': '74d42562-7209-4bfa-b690-cb5c23fadf2f',
  'packmind-update-playbook': 'cf068672-d48e-4669-a8e2-aa7d7d027f94',
});

const DEFAULT_SKILL_ID_SET: ReadonlySet<string> = new Set(
  Object.values(DEFAULT_SKILL_IDS),
);

const DEFAULT_SKILL_SLUG_SET: ReadonlySet<string> = new Set(
  Object.keys(DEFAULT_SKILL_IDS),
);

// getDefaultSkillVersionId and getDefaultSkillAuthorUserId stay memoized: their
// output never lands in the lockfile (only skv.skillId does, via
// PackmindLockFileService.buildVersionLookup), so cross-process stability adds
// no observable value.
const skillVersionIdByKey = new Map<string, string>();
let defaultSkillAuthorUserId: string | null = null;

export function getDefaultSkillId(slug: string): string {
  const id = DEFAULT_SKILL_IDS[slug];
  if (!id) {
    throw new Error(
      `No hardcoded UUID for default skill slug "${slug}". Add it to ` +
        `DEFAULT_SKILL_IDS in defaultSkillIdUtils.ts.`,
    );
  }
  return id;
}

export function isDefaultSkillId(id: string): boolean {
  return DEFAULT_SKILL_ID_SET.has(id);
}

// Matches the *slug* form of a default-skill identifier (e.g.
// `'packmind-create-skill'`). Pre-316404566 lockfiles stored slugs in the
// artifact `id` field, so the API still has to accept them — see the validation
// in GetContentByVersionsUseCase.
export function isDefaultSkillSlug(id: string): boolean {
  return DEFAULT_SKILL_SLUG_SET.has(id);
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
