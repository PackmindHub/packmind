import { PMText } from '@packmind/ui';
import { CommandId, SkillId, StandardId } from '@packmind/types';

export type ArtefactOptionId = StandardId | CommandId | SkillId;

export type ArtefactOption<Id extends ArtefactOptionId> = {
  label: string;
  value: Id;
  disabled: boolean;
  /** The other package holding it, set only when that is why it is disabled. */
  heldBy?: string;
};

/**
 * One row of a package form's dropdown.
 *
 * A component belongs to a single package, so one another package holds
 * cannot be picked here — it has to be moved from wherever it lives. One
 * already selected stays selectable whatever the data says, so a component
 * that somehow ended up in two packages can still be taken out of this one.
 */
export function toArtefactOption<Id extends ArtefactOptionId>(
  artefact: { id: Id; name: string },
  selectedIds: Id[],
  ownerByArtefactId: Record<string, string>,
): ArtefactOption<Id> {
  const heldBy = ownerByArtefactId[artefact.id.toString()];
  const locked = Boolean(heldBy) && !selectedIds.includes(artefact.id);

  return {
    label: artefact.name,
    value: artefact.id,
    disabled: locked,
    heldBy: locked ? heldBy : undefined,
  };
}

/**
 * Why an option cannot be picked: it is somewhere else. Naming the package
 * turns a dead entry into a direction to go.
 */
export function HeldByPackage({ packageName }: { packageName?: string }) {
  if (!packageName) return null;

  return (
    <PMText variant="small" color="faded" marginLeft="auto" paddingLeft={2}>
      In {packageName}
    </PMText>
  );
}
