import {
  installDriftEntries,
  type DriftArtifactEntry,
} from '../redesign/selectors/installDriftEntries';
import type { PackageDrift } from '../redesign/types';
import { componentSelectionKey } from './buildPackageContext';

/**
 * How many of a package's landings each of its components is late on.
 *
 * The inverse of what the Distribution tab reads. That one asks, of a landing,
 * which components are behind on it; this asks, of a component, how many
 * landings it has not reached. Same drift, pivoted, and it is the fact neither
 * tab could state: the component list knew what exists and not where it stands,
 * the destination list knew where things stand and not which component the
 * reader was looking at.
 *
 * Landings only, and that is a gap rather than a claim. A marketplace copy
 * knows it has been overtaken, not by which components, so a package published
 * to one and late there adds nothing to any count here. Saying `behind on 3`
 * where the truth is "3 landings and a catalog we cannot break down" is the
 * lesser wrong: the number is of a kind the reader can act on, and the tab next
 * door carries the catalog in full.
 *
 * Keyed the way the rows are, by `componentSelectionKey`, and not by the
 * artefact id alone: a standard and a skill can carry the same id, so a map on
 * the id would mark one row with the other's drift.
 */
export function componentLateness(
  drift: PackageDrift | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!drift) return counts;

  for (const install of installDriftEntries(drift)) {
    /*
     * Every reason counts, including the two that are not a version behind: a
     * component never written there and one waiting to be taken away are both
     * things this landing does not agree with the package about, which is
     * what the reader is being told.
     */
    for (const { artifact } of install.behindArtifacts) {
      const key = componentSelectionKey({
        type: artifact.kind,
        key: artifact.id,
      });
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * What each component is missing on one landing in particular.
 *
 * The count above answers "how widely is this late"; this answers "what is
 * wrong here", which is the question someone debugging a single repository
 * arrives with and which no count can answer: `behind on 9` does not say
 * whether this one is two versions back or was never written at all.
 *
 * Keyed like the counts, and empty for a landing this package does not reach,
 * which the caller reads as "nothing to say" rather than "everything is fine".
 */
export function componentDriftOn(
  drift: PackageDrift | null,
  installKey: string,
): Map<string, DriftArtifactEntry> {
  const here = new Map<string, DriftArtifactEntry>();
  if (!drift) return here;

  const landing = installDriftEntries(drift).find(
    (entry) => `${entry.repo.id}::${entry.target.id}` === installKey,
  );
  if (!landing) return here;

  for (const entry of landing.behindArtifacts) {
    here.set(
      componentSelectionKey({
        type: entry.artifact.kind,
        key: entry.artifact.id,
      }),
      entry,
    );
  }

  return here;
}
