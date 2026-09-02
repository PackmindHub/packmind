import type {
  ArtifactType,
  Command,
  CommandId,
  PackageResponse,
  Skill,
  SkillId,
  Standard,
  StandardId,
} from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';

/**
 * The kinds of thing a package carries. One entry per type, and the grouping,
 * the headings and the order of the pane are all derived from it: adding a type
 * means adding a member here, never adding a navigation entry.
 *
 * An alias rather than its own union. The list was written out here and again in
 * `@packmind/types` as `ArtifactType`, which is the one the API and the
 * distribution layer speak. Two identical unions in two files is a drift
 * waiting for the fourth type: whichever one is edited first, the other keeps
 * compiling and the pane and the payload disagree about what exists. Tying them
 * means `'mcp'` is added once, and every exhaustive record downstream, here and
 * in the creation registry, stops compiling until it is answered.
 */
export type ContextComponentType = ArtifactType;

/**
 * A row of the Context pane. Flattened on purpose — the pane must not have to
 * know that a standard is addressed by id and a skill by slug, nor which of
 * the three entities happens to carry a description.
 */
export type ContextComponent = {
  key: string;
  type: ContextComponentType;
  name: string;
  /** Empty for a command: the entity has no description, only its content. */
  summary: string;
  version: number;
  href: string;
  /**
   * When the entity was created, as the API sends it, or null when it sent
   * none. Carried on the row because the inventory orders the components in no
   * package by it: alphabetical is the right order for reading a catalogue and
   * the wrong one for reading a backlog, where the newest one is the one just
   * created and not yet placed.
   */
  createdAt: string | null;
};

/**
 * How a component is told apart while several are picked at once.
 *
 * Not `key` alone. That is the entity id, and two entities of different types
 * can carry the same one: the membership payload separates them by type, so a
 * selection built on the id alone would tick two rows at once and move a
 * component nobody picked.
 */
export function componentSelectionKey(
  component: Pick<ContextComponent, 'type' | 'key'>,
): string {
  return `${component.type}:${component.key}`;
}

export type ContextGroup = {
  type: ContextComponentType;
  label: string;
  components: ContextComponent[];
};

export type PackageContext = {
  groups: ContextGroup[];
  total: number;
};

/** What a package holds, before the ids are resolved into entities. */
export type PackageComponentIds = Pick<
  PackageResponse,
  'standards' | 'commands' | 'skills'
>;

export type SpaceCatalogue = {
  standards: readonly Standard[];
  commands: readonly Command[];
  skills: readonly Skill[];
};

export type ContextLinkTarget = {
  orgSlug: string;
  spaceSlug: string;
};

/**
 * The order the groups appear in, and the only place it is decided. It matches
 * the order the current navigation lists the three types in, so moving from one
 * architecture to the other does not also reshuffle what the eye expects.
 */
export const COMPONENT_TYPE_ORDER: readonly ContextComponentType[] = [
  'standard',
  'command',
  'skill',
];

export const COMPONENT_TYPE_LABELS: Record<ContextComponentType, string> = {
  standard: 'Standards',
  command: 'Commands',
  skill: 'Skills',
};

/**
 * The same names in the singular, for the places that qualify one component
 * rather than heading a group of them — a search result in the rail says what
 * kind of thing it found.
 */
export const COMPONENT_TYPE_LABELS_SINGULAR: Record<
  ContextComponentType,
  string
> = {
  standard: 'Standard',
  command: 'Command',
  skill: 'Skill',
};

/**
 * What a set of picked components is called in a sentence.
 *
 * One is named by its own type, several of one type by that type's plural, and a
 * mixed set by "components": naming the first type would say something untrue
 * about the rest, and counting the types would read as a summary of the list the
 * user has just built rather than as a name for it.
 *
 * Lower case, because every caller drops it mid-sentence rather than starting
 * one with it.
 */
export function componentSetKind(
  components: readonly Pick<ContextComponent, 'type'>[],
): string {
  if (components.length === 1) {
    return COMPONENT_TYPE_LABELS_SINGULAR[components[0].type].toLowerCase();
  }

  const types = new Set(components.map((component) => component.type));
  if (types.size === 1) {
    return COMPONENT_TYPE_LABELS[components[0].type].toLowerCase();
  }

  return 'components';
}

/**
 * How a sentence refers to a set of picked components: one is named, several are
 * counted.
 *
 * The count and the noun cannot disagree, because the noun is
 * `componentSetKind` reading the same set. Three surfaces say this now, and they
 * say it about the same selection in the same words: what is being added, what
 * is being moved, and what is being taken back out.
 */
export function componentSetSubject(
  components: readonly Pick<ContextComponent, 'type' | 'name'>[],
): string {
  return components.length === 1
    ? components[0].name
    : `${components.length} ${componentSetKind(components)}`;
}

/*
 * One mapper per type, exported because two surfaces build the same row from
 * the same entity: a package's own content and the space-wide inventory. Two
 * copies would have grown two ideas of what a row of this app is.
 */

/**
 * The creation date of a standard, a command or a skill, normalised to the
 * string the API sends.
 *
 * Read through a cast because the three domain types disagree with the payload:
 * all three tables carry `created_at` through `timestampsSchemas` and all three
 * responses have it, but only `Skill` declares it, and it declares a `Date`
 * where the wire carries a string. Declaring it on the other two would add a
 * required field to types that a large number of fixtures build by hand, for a
 * sort. `CommandVersionsListDrawer` reads a timestamp the same way, for the
 * same reason.
 */
function creationDateOf(entity: Standard | Command | Skill): string | null {
  const value = (entity as { createdAt?: Date | string | null }).createdAt;
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function standardToComponent(
  standard: Standard,
  { orgSlug, spaceSlug }: ContextLinkTarget,
): ContextComponent {
  return {
    key: standard.id,
    type: 'standard',
    name: standard.name,
    summary: standard.description ?? '',
    version: standard.version,
    href: routes.space.toStandard(orgSlug, spaceSlug, standard.id),
    createdAt: creationDateOf(standard),
  };
}

export function commandToComponent(
  command: Command,
  { orgSlug, spaceSlug }: ContextLinkTarget,
): ContextComponent {
  return {
    key: command.id,
    type: 'command',
    name: command.name,
    summary: '',
    version: command.version,
    href: routes.space.toCommand(orgSlug, spaceSlug, command.id),
    createdAt: creationDateOf(command),
  };
}

/**
 * By slug, not by id: the skill detail route is the one of the three that is
 * addressed by slug. Reading the difference off the entity here is what keeps
 * it out of the row components.
 */
export function skillToComponent(
  skill: Skill,
  { orgSlug, spaceSlug }: ContextLinkTarget,
): ContextComponent {
  return {
    key: skill.id,
    type: 'skill',
    name: skill.name,
    summary: skill.description ?? '',
    version: skill.version,
    href: routes.space.toSkill(orgSlug, spaceSlug, skill.slug),
    createdAt: creationDateOf(skill),
  };
}

/**
 * Crosses the ids a package holds with the space's catalogues and returns the
 * rows of the Context pane, grouped by type.
 *
 * Ids with no entity behind them are dropped rather than rendered as a blank
 * row: a package can reference an artefact that has since moved to another
 * space, and the same silence is what the package detail page already does.
 *
 * Pure, so the pane's whole content decision is testable without a router, a
 * query client or a provider.
 */
export function buildPackageContext(
  pkg: PackageComponentIds,
  catalogue: SpaceCatalogue,
  { orgSlug, spaceSlug }: ContextLinkTarget,
): PackageContext {
  const target = { orgSlug, spaceSlug };
  const byType: Record<ContextComponentType, ContextComponent[]> = {
    standard: resolve(pkg.standards, catalogue.standards, (standard) =>
      standardToComponent(standard, target),
    ),
    command: resolve(pkg.commands, catalogue.commands, (command) =>
      commandToComponent(command, target),
    ),
    skill: resolve(pkg.skills, catalogue.skills, (skill) =>
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
    total: groups.reduce((count, group) => count + group.components.length, 0),
  };
}

/** How many components a package holds, without resolving any of them. */
export function packageComponentCount(pkg: PackageComponentIds): number {
  return (
    (pkg.standards?.length ?? 0) +
    (pkg.commands?.length ?? 0) +
    (pkg.skills?.length ?? 0)
  );
}

function resolve<
  Id extends StandardId | CommandId | SkillId,
  Entity extends { id: Id; name: string },
>(
  ids: readonly Id[] | undefined,
  catalogue: readonly Entity[],
  toComponent: (entity: Entity) => ContextComponent,
): ContextComponent[] {
  const wanted = new Set<string>(ids ?? []);
  return catalogue
    .filter((entity) => wanted.has(entity.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toComponent);
}
