import type { CommandId, SkillId, StandardId } from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS,
  COMPONENT_TYPE_ORDER,
  commandToComponent,
  skillToComponent,
  standardToComponent,
  type ContextComponent,
  type ContextComponentType,
  type ContextGroup,
  type ContextLinkTarget,
  type PackageComponentIds,
  type SpaceCatalogue,
} from './buildPackageContext';

/**
 * What a package could still be given, and how much there was to give.
 *
 * The two counts are not the same question. `total` is how many rows the picker
 * has, and `catalogueTotal` is how many components the space owns at all, which
 * is what tells an empty picker which of two things happened: a space with
 * nothing in it yet, or a package that already holds everything there is. The
 * grouped list cannot answer that on its own, because both cases arrive here as
 * zero groups.
 */
export type AddableComponents = {
  groups: ContextGroup[];
  total: number;
  catalogueTotal: number;
};

/**
 * The complement of `buildPackageContext`: the components of the space that
 * this package does not carry, grouped by type.
 *
 * Built from the same two inputs as the pane's own content, and through the
 * same three mappers, so a row offered for adding is the same object as the row
 * it becomes once added: one name, one summary, one version, decided in one
 * place. The picker renders it differently, because a candidate is ticked where
 * a member is opened, but it is not describing a different thing.
 *
 * Local, like the move targets: the space catalogue and the package's ids are
 * both already loaded by the Context surface, so nothing here needs the server.
 * Asking it what is addable would also let the picker disagree with the pane
 * behind it.
 *
 * A type with nothing left to add is dropped rather than shown empty, which is
 * what the pane does with a type the package does not carry. Groups are in the
 * pane's order and alphabetical inside it, so the picker reads as the list it
 * is about to add to.
 */
export function buildAddableComponents(
  pkg: PackageComponentIds,
  catalogue: SpaceCatalogue,
  target: ContextLinkTarget,
): AddableComponents {
  const byType: Record<ContextComponentType, ContextComponent[]> = {
    standard: absent(catalogue.standards, pkg.standards, (standard) =>
      standardToComponent(standard, target),
    ),
    command: absent(catalogue.commands, pkg.commands, (command) =>
      commandToComponent(command, target),
    ),
    skill: absent(catalogue.skills, pkg.skills, (skill) =>
      skillToComponent(skill, target),
    ),
  };

  const groups = COMPONENT_TYPE_ORDER.filter(
    (type) => byType[type].length > 0,
  ).map((type) => ({
    type,
    label: COMPONENT_TYPE_LABELS[type],
    components: byType[type],
  }));

  return {
    groups,
    total: groupedComponentCount(groups),
    catalogueTotal:
      catalogue.standards.length +
      catalogue.commands.length +
      catalogue.skills.length,
  };
}

/**
 * How many components a grouped list holds. Exported because the picker asks it
 * twice: once of everything addable, and once of what a query left, and the
 * second one has no `total` of its own.
 */
export function groupedComponentCount(groups: readonly ContextGroup[]): number {
  return groups.reduce((count, group) => count + group.components.length, 0);
}

/**
 * The addable components a query keeps, still grouped, with the groups a query
 * emptied dropped.
 *
 * Name and description, the two fields the rail searches packages by, so a
 * component found from the rail's search is findable here under the same words.
 * A command has no description, only its content, so for that type this is a
 * search on the name alone. Searching the content would find a component by
 * words that are nowhere on the row it returns.
 */
export function filterAddableComponents(
  groups: readonly ContextGroup[],
  query: string,
): ContextGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...groups];

  return groups
    .map((group) => ({
      ...group,
      components: group.components.filter(
        (component) =>
          component.name.toLowerCase().includes(needle) ||
          component.summary.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.components.length > 0);
}

/**
 * The entities of one catalogue whose id the package does not already hold.
 *
 * The mirror of `resolve` in `buildPackageContext`, down to sorting the rows
 * before mapping them: one comparison per pair on a name the entity already
 * carries, rather than on a row that has yet to be built.
 */
function absent<
  Id extends StandardId | CommandId | SkillId,
  Entity extends { id: Id; name: string },
>(
  catalogue: readonly Entity[],
  held: readonly Id[] | undefined,
  toComponent: (entity: Entity) => ContextComponent,
): ContextComponent[] {
  const inside = new Set<string>(held ?? []);
  return catalogue
    .filter((entity) => !inside.has(entity.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toComponent);
}
