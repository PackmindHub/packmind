import { FileModification, FileUpdates } from '@packmind/types';
import { DefaultSkillMetadata } from '@packmind/coding-agent';
import { getDefaultSkillId } from './defaultSkillIdUtils';

/**
 * Stamps default-skill artifact metadata onto the `FileModification[]` produced
 * by `DefaultSkillsDeployer.deployDefaultSkills`, matching a file to the
 * deployed skill whose slug appears as one of its path segments. Unmatched
 * files are returned untouched, so a foreign file can never be mis-tagged.
 *
 * The default-skill counterpart of {@link enrichFileModificationsWithMetadata},
 * with no DB lookups: `deployedSkills` already carries everything needed.
 *
 * `spaceId` and `packageIds` come out empty because default skills belong to no
 * Packmind space or package; on `artifactId`, see `defaultSkillIdUtils`.
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
