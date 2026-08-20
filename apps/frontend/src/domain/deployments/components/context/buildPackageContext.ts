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
const GROUP_ORDER: readonly ContextComponentType[] = [
  'standard',
  'command',
  'skill',
];

const GROUP_LABELS: Record<ContextComponentType, string> = {
  standard: 'Standards',
  command: 'Commands',
  skill: 'Skills',
};

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
  const byType: Record<ContextComponentType, ContextComponent[]> = {
    standard: resolve(pkg.standards, catalogue.standards, (standard) => ({
      key: standard.id,
      type: 'standard' as const,
      name: standard.name,
      summary: standard.description ?? '',
      version: standard.version,
      href: routes.space.toStandard(orgSlug, spaceSlug, standard.id),
    })),
    command: resolve(pkg.commands, catalogue.commands, (command) => ({
      key: command.id,
      type: 'command' as const,
      name: command.name,
      summary: '',
      version: command.version,
      href: routes.space.toCommand(orgSlug, spaceSlug, command.id),
    })),
    /*
     * By slug, not by id: the skill detail route is the one of the three that
     * is addressed by slug. Reading the difference off the entity here is what
     * keeps it out of the row component.
     */
    skill: resolve(pkg.skills, catalogue.skills, (skill) => ({
      key: skill.id,
      type: 'skill' as const,
      name: skill.name,
      summary: skill.description ?? '',
      version: skill.version,
      href: routes.space.toSkill(orgSlug, spaceSlug, skill.slug),
    })),
  };

  const groups = GROUP_ORDER.filter((type) => byType[type].length > 0).map(
    (type) => ({
      type,
      label: GROUP_LABELS[type],
      components: byType[type],
    }),
  );

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
