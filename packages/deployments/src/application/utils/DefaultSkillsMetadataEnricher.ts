import {
  DefaultSkillMetadata,
  FileModification,
  FileUpdates,
} from '@packmind/types';
import { getDefaultSkillId } from './defaultSkillIdUtils';

/**
 * Pure-function enricher that stamps default-skill artifact metadata onto the
 * `FileModification[]` produced by `DefaultSkillsDeployer.deployDefaultSkills`.
 *
 * Mirrors {@link enrichFileModificationsWithMetadata} (used by the user/package
 * install flow) but scoped to default-skill data the deployers already expose
 * — there are no DB lookups.
 *
 * Matching strategy
 * -----------------
 * Default-skill deployers emit every file under a per-skill `basePath` that
 * embeds the skill's slug (e.g. `.test/skills/packmind-create-skill/SKILL.md`).
 * We match by checking whether the path contains a deployed-skill slug as a
 * `/`-bounded segment. The set of deployed slugs is provided by the caller via
 * `deployedSkills`, so the enricher never invents metadata for files it does
 * not own.
 *
 * Output guarantees
 * -----------------
 * - Files matched to a deployed skill receive `artifactType: 'skill'`,
 *   `artifactId: getDefaultSkillId(slug)` (a deterministic UUID — the
 *   content-by-versions endpoint queries a uuid-typed column, so even
 *   synthetic default-skill ids must be valid UUIDs), `artifactSlug: slug`,
 *   `artifactName`, `artifactVersion`, `source: 'default'`, plus zeroed
 *   `spaceId: ''` and `packageIds: []` (default skills are not scoped to a
 *   Packmind space or package).
 * - Files NOT matched to any deployed skill are returned untouched. This is
 *   defensive — in practice the deployer's output and `deployedSkills` should
 *   be 1:1 — but it guarantees the enricher can never accidentally mis-tag a
 *   foreign file.
 */
export function enrichDefaultSkillsFileModifications(
  fileUpdates: FileUpdates,
  deployedSkills: DefaultSkillMetadata[],
): FileUpdates {
  const slugIndex = new Map<string, DefaultSkillMetadata>();
  for (const skill of deployedSkills) {
    slugIndex.set(skill.slug, skill);
  }

  const enrichedCreateOrUpdate = fileUpdates.createOrUpdate.map((file) =>
    enrichFileModification(file, slugIndex),
  );

  return {
    createOrUpdate: enrichedCreateOrUpdate,
    delete: fileUpdates.delete,
  };
}

function enrichFileModification(
  file: FileModification,
  slugIndex: Map<string, DefaultSkillMetadata>,
): FileModification {
  const match = findMatchingSkill(file.path, slugIndex);
  if (!match) {
    return file;
  }

  return {
    ...file,
    artifactType: 'skill',
    artifactId: getDefaultSkillId(match.slug),
    artifactSlug: match.slug,
    artifactName: match.name,
    artifactVersion: match.version,
    spaceId: '',
    packageIds: [],
    source: 'default',
  };
}

function findMatchingSkill(
  path: string,
  slugIndex: Map<string, DefaultSkillMetadata>,
): DefaultSkillMetadata | undefined {
  const segments = path.split('/');
  for (const segment of segments) {
    const match = slugIndex.get(segment);
    if (match) {
      return match;
    }
  }
  return undefined;
}
