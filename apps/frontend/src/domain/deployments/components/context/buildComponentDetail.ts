import type { CommandId, PackageId } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import { PACKAGE_PARAM } from '../../hooks/useCreateIntoPackage';
import type {
  ContextComponent,
  ContextComponentType,
  ContextGroup,
  ContextLinkTarget,
} from './buildPackageContext';

/**
 * The component the pane is showing, in the URL, beside the package it is being
 * read from.
 *
 * In the URL for the same reason the package and the tab are: a component is
 * the thing people send each other a link to, and reading one is a state worth
 * reloading into. Its value is the component's key, which is the entity id for
 * all three types.
 *
 * The package stays in the address next to it. It is not redundant: the pane
 * shows the component *inside* a package, and it is that package the back link
 * returns to and the move dialog moves out of.
 */
export const COMPONENT_PARAM = 'component';

/**
 * Which types the pane can show itself, and the only place it is decided.
 *
 * The types that say no are not broken, they are not written yet: their rows
 * keep pointing at their own detail page, which is where they are read today.
 * One entry flips per increment, and when all three are true the per-type pages
 * have no reader left, which is what makes them removable.
 *
 * A record over the union rather than a list, so a new component type cannot be
 * added without answering the question here.
 */
export const RENDERS_IN_PANE: Record<ContextComponentType, boolean> = {
  standard: true,
  command: true,
  skill: false,
};

/**
 * The address of a component in the pane, built from the parameters the surface
 * already has rather than from scratch.
 *
 * Building it from scratch would drop everything else in the address, and one
 * of those is the navigation mode: a row click would send a user reading the
 * plugin-first navigation back to the old one.
 *
 * Search-only, so the path is the caller's and this cannot navigate anywhere
 * but the surface it is already on.
 */
export function componentDetailHref(
  searchParams: URLSearchParams,
  packageId: PackageId,
  componentKey: string,
): string {
  const next = new URLSearchParams(searchParams);
  next.set(PACKAGE_PARAM, packageId);
  next.set(COMPONENT_PARAM, componentKey);
  return `?${next.toString()}`;
}

/** The way back out of a component, to the package it was read from. */
export function packageDetailHref(
  searchParams: URLSearchParams,
  packageId: PackageId,
): string {
  const next = new URLSearchParams(searchParams);
  next.set(PACKAGE_PARAM, packageId);
  next.delete(COMPONENT_PARAM);
  return `?${next.toString()}`;
}

/**
 * A row of the package pane, pointed at the pane itself when the pane can show
 * what it points to.
 *
 * The rewrite happens here rather than in `buildPackageContext` because the
 * default target is the right one everywhere else: the space-wide inventory and
 * the rail's search results are not scoped to a package, and a component read
 * outside a package has no back link and nothing to be moved out of.
 */
export function withPaneDetailHref(
  component: ContextComponent,
  searchParams: URLSearchParams,
  packageId: PackageId,
): ContextComponent {
  if (!RENDERS_IN_PANE[component.type]) return component;
  return {
    ...component,
    href: componentDetailHref(searchParams, packageId, component.key),
  };
}

/**
 * The component the address asks for, or null to show the package's list.
 *
 * Resolved against the rows the pane just built, so a component that left the
 * package falls back to the list on its own: that is what happens the moment a
 * move succeeds, and it is the correct thing to show.
 *
 * A type the pane cannot render is treated as no request at all. Nothing links
 * to one today, but an address can be edited by hand, and a blank pane is a
 * worse answer than the list.
 */
export function selectDetailComponent(
  groups: readonly ContextGroup[],
  requested: string | null,
): ContextComponent | null {
  if (!requested) return null;

  for (const group of groups) {
    const found = group.components.find(
      (component) => component.key === requested,
    );
    if (found) return RENDERS_IN_PANE[found.type] ? found : null;
  }

  return null;
}

/**
 * Where this component is edited, or null when it has no edit route of its own.
 *
 * Standards and skills are edited from their own page, which has no separate
 * edit address to send anyone to. Null rather than a link to the page: the pane
 * already offers a way to open it, and two buttons landing in the same place
 * would both be lying about what one of them does.
 */
/**
 * The rules of a standard, in the order its own page lists them.
 *
 * Sorted here rather than left in the order the endpoint returns them, and
 * sorted the same way, because the two surfaces show the same list: a reader
 * moving between them would otherwise see the rules shuffle for no reason.
 */
export function sortRulesByContent<Rule extends { content: string }>(
  rules: readonly Rule[],
): Rule[] {
  return [...rules].sort((first, second) =>
    first.content.localeCompare(second.content, undefined, {
      sensitivity: 'base',
    }),
  );
}

export function componentEditHref(
  component: Pick<ContextComponent, 'type' | 'key'>,
  { orgSlug, spaceSlug }: ContextLinkTarget,
): string | null {
  switch (component.type) {
    case 'command':
      return routes.space.toEditCommand(
        orgSlug,
        spaceSlug,
        component.key as CommandId,
      );
    case 'standard':
    case 'skill':
      return null;
  }
}
