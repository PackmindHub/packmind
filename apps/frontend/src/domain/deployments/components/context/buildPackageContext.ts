import type {
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
 */
export type ContextComponentType = 'standard' | 'command' | 'skill';

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
};

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

/*
 * One mapper per type, exported because two surfaces build the same row from
 * the same entity: a package's own content and the space-wide inventory. Two
 * copies would have grown two ideas of what a row of this app is.
 */

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
