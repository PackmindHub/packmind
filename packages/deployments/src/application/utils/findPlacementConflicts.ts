import { ArtifactType, Package, PackageId } from '@packmind/types';
import { ArtefactPlacementConflict } from '../../domain/errors/ArtefactAlreadyInAnotherPackageError';

/**
 * Identifies one artefact across the three kinds a package holds.
 *
 * The kind is part of the key rather than a field beside it because a package
 * holds its standards, commands and skills in three separate lists and an id
 * is only unique within one of them. Keyed by id alone, a standard would
 * answer for a command that happened to share its id, and an add that conflicts
 * with nothing would be refused on behalf of an artefact the caller never named.
 */
export const placementKey = (type: ArtifactType, artefactId: string): string =>
  `${type}:${artefactId}`;

/** The artefacts a caller asked to place, by the key above. */
export type ArtefactsBeingPlaced = Map<
  string,
  { type: ArtifactType; name: string }
>;

/**
 * Which of the artefacts being placed are already held by one of these
 * packages, named as the caller would recognise them.
 *
 * `excludePackageId` is the package being written to, when there is one: an
 * artefact it already holds is the request being satisfied, not a conflict.
 */
export function findPlacementConflicts(
  packages: Package[],
  artefacts: ArtefactsBeingPlaced,
  excludePackageId?: PackageId,
): ArtefactPlacementConflict[] {
  if (artefacts.size === 0) return [];

  const conflicts: ArtefactPlacementConflict[] = [];

  for (const pkg of packages) {
    if (pkg.id === excludePackageId) continue;

    const held: Array<[ArtifactType, string]> = [
      ...(pkg.standards ?? []).map((id): [ArtifactType, string] => [
        'standard',
        String(id),
      ]),
      ...(pkg.recipes ?? []).map((id): [ArtifactType, string] => [
        'command',
        String(id),
      ]),
      ...(pkg.skills ?? []).map((id): [ArtifactType, string] => [
        'skill',
        String(id),
      ]),
    ];

    for (const [type, artefactId] of held) {
      const artefact = artefacts.get(placementKey(type, artefactId));
      if (!artefact) continue;

      conflicts.push({
        artefactType: artefact.type,
        artefactId,
        artefactName: artefact.name,
        packageName: pkg.name,
      });
    }
  }

  return conflicts;
}
