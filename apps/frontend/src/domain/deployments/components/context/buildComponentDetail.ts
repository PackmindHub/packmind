import type { CommandId, PackageId, StandardId } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import {
  PACKAGE_PARAM,
  withPackageParam,
} from '../../hooks/useCreateIntoPackage';
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
 * The file of that component the pane is showing, when the component is a
 * folder rather than a document.
 *
 * Only a skill has files, so only a skill ever puts this in the address. Its
 * value is the file's path, which is what the skill's own routes use too, so
 * the same file is named the same way on both surfaces.
 *
 * SKILL.md is never in here. It is not a file the API returns, it is the
 * component itself, and the address that shows it is the one with no file in
 * it at all.
 */
export const FILE_PARAM = 'file';

/**
 * Which types the pane can show itself, and the only place it is decided.
 *
 * All three types say yes now, so no row in a package pane leads out of the
 * surface any more. The per-type pages still have readers, though: the frame's
 * "Open ..." button, the space inventory and the rail's search results all
 * still point at them, and cutting those is a step of its own.
 *
 * The record stays because the question does. A fourth type arrives with no
 * body written for it, and this is where it says so, rather than by leaving a
 * blank pane behind a row that looked like the others.
 *
 * A record over the union rather than a list, so a new component type cannot be
 * added without answering the question here.
 */
export const RENDERS_IN_PANE: Record<ContextComponentType, boolean> = {
  standard: true,
  command: true,
  skill: true,
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
  // A file belongs to the component it was opened from, so a different
  // component cannot inherit it. Two skills can hold the same path.
  next.delete(FILE_PARAM);
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
  next.delete(FILE_PARAM);
  return `?${next.toString()}`;
}

/**
 * The Context surface of a space, opened on one package and, when asked, on one
 * of its components.
 *
 * A whole path, unlike the search-only builders above it, because its callers
 * are not on this surface: they are the create and edit forms, which are pages
 * of their own and have to come back. Coming back is the point. The pages they
 * landed on until now have no entry in the plugin-first sidebar, so finishing a
 * form left the user outside the navigation, and the way back in opened the
 * first package of the space rather than the one being filled.
 *
 * It carries only what it names. These callers arrive from a page rather than
 * from a selection, so there is no address of theirs worth keeping: the mode is
 * read from storage and everything else was left behind when the form opened.
 */
export function contextPackageHref(
  { orgSlug, spaceSlug }: ContextLinkTarget,
  packageId: PackageId,
  componentKey?: string,
): string {
  const params = new URLSearchParams({ [PACKAGE_PARAM]: packageId });
  if (componentKey) {
    params.set(COMPONENT_PARAM, componentKey);
  }
  return `${routes.space.toContext(orgSlug, spaceSlug)}?${params.toString()}`;
}

/**
 * The address of one file of the component that is already open.
 *
 * It names no component, only the file. The rail that builds these links is the
 * open component's own file tree, so a link that could name another one would
 * be a link that can lie about what the tree is showing.
 */
export function componentFileHref(
  searchParams: URLSearchParams,
  path: string,
): string {
  const next = new URLSearchParams(searchParams);
  next.set(FILE_PARAM, path);
  return `?${next.toString()}`;
}

/** The way back from a file to the component that carries it. */
export function componentEntryHref(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  next.delete(FILE_PARAM);
  return `?${next.toString()}`;
}

/**
 * The file the address asks for, or null to show the component itself.
 *
 * Resolved against the files the query returned, so a path that is no longer in
 * the skill falls back to its instructions instead of an empty frame.
 *
 * SKILL.md resolves to null by the same rule rather than by a special case: it
 * is not one of these files, it is the component, and the address that shows it
 * is the one with no file in it.
 */
export function selectSkillFile<File extends { path: string }>(
  files: readonly File[],
  requested: string | null,
): File | null {
  if (!requested) return null;
  return files.find((file) => file.path === requested) ?? null;
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

/**
 * The files a skill ships beside its instructions, in a stable order.
 *
 * The endpoint promises no order at all, which reads as none the moment a skill
 * has a folder or two. Sorted by path, so the files of one folder stay
 * together, and case-insensitively for the same reason the rules are: a
 * lowercase name is not a less important one.
 */
export function sortFilesByPath<File extends { path: string }>(
  files: readonly File[],
): File[] {
  return [...files].sort((first, second) =>
    first.path.localeCompare(second.path, undefined, {
      sensitivity: 'base',
    }),
  );
}

/**
 * Where this component is edited, or null when it has no edit form to send
 * anyone to.
 *
 * A skill is the null. It has no single form: its instructions and each of its
 * files are edited one at a time, on its own page, so there is no one address
 * that means "edit this skill". Null rather than a link to that page, because
 * the pane already offers a way to open it and two buttons landing in the same
 * place would both be lying about what one of them does.
 *
 * The package rides along in the address when there is one. The form is a page
 * of its own and has to come back; the package is the only thing that says
 * where from, since by then the pane that opened it is gone.
 */
export function componentEditHref(
  component: Pick<ContextComponent, 'type' | 'key'>,
  { orgSlug, spaceSlug }: ContextLinkTarget,
  packageId?: PackageId,
): string | null {
  switch (component.type) {
    case 'command':
      return withPackageParam(
        routes.space.toEditCommand(
          orgSlug,
          spaceSlug,
          component.key as CommandId,
        ),
        packageId,
      );
    case 'standard':
      return withPackageParam(
        routes.space.toStandardEdit(
          orgSlug,
          spaceSlug,
          component.key as StandardId,
        ),
        packageId,
      );
    case 'skill':
      return null;
  }
}
