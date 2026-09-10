import type { CommandId, PackageId, StandardId } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import {
  PACKAGE_PARAM,
  withPackageParam,
} from '../../hooks/useCreateIntoPackage';
import {
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
import { packageHoldsComponent } from './buildMoveTargets';

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
 * The rule of that component the pane is showing, when the component is a
 * standard and the address asks for one.
 *
 * The same move `FILE_PARAM` is, one type over. A skill is a folder and its
 * files are its leaves; a standard is a document and its rules are its. Both
 * open in place of the component rather than beside it, because the component
 * is what they are part of and there is one pane.
 *
 * Its value is the rule's id, which is what the standard's own rule route uses,
 * so the same rule is named the same way on both surfaces.
 *
 * Why a depth at all, when a rule is already a row of the standard's body: the
 * row holds the sentence and whether anything detects it, which is what a
 * reader wants. Setting it up is a screen's worth of work, its code examples
 * per language, and until this parameter existed the only place that screen
 * existed was a page outside the surface. Following a rule out of Context to
 * configure it is the thing this whole plan is about.
 */
export const RULE_PARAM = 'rule';

/**
 * Which half of what is on screen is being read.
 *
 * One parameter for both depths, because two things on this surface cannot be
 * open at once: while a component is open `tab` names the component's tab, and
 * the rest of the time it names the package's. Reconciling two parameters that
 * can disagree is worse than reading one two ways.
 *
 * In the URL for the same reason the package and the component are: "this
 * package is behind in two repositories" is a thing people send each other, and
 * it has to survive being pasted.
 */
export const TAB_PARAM = 'tab';

/**
 * What the `package` parameter says when the pane shows the space-wide
 * inventory instead of one package. One parameter, one meaning, "what the pane
 * shows", rather than two that have to be reconciled when they disagree.
 * Package ids are generated, so nothing can collide with it.
 *
 * Arriving on Context without the parameter still lands on a package, which is
 * what says the package is the unit here. The inventory is a way of reading it,
 * reachable by link but never the default.
 *
 * Here rather than on the surface that reads it, because it is a value of the
 * same parameter the builders below write, and a component read with no package
 * has to be able to build the way back to it.
 */
export const INVENTORY_VALUE = 'all';

export const COMPONENTS_TAB = 'components';
export const INSTRUCTIONS_TAB = 'instructions';

/**
 * Shared by both depths on purpose. Closing a component while reading where it
 * landed lands on where its package landed, which is the same question one
 * scope out, so the tab that survives the move is the honest answer.
 */
export const DISTRIBUTION_TAB = 'distribution';

/**
 * Not shared, unlike the one above it. A package has no history of its own: the
 * versions listed here belong to one component, and closing the component
 * leaves nothing for this tab to be about.
 */
export const HISTORY_TAB = 'history';

/**
 * The two halves of a rule: what it looks like in code, and what checks it.
 *
 * `examples` is the default and stays out of the address, the same way the
 * other two depths' defaults do. `linter` is in the address while a rule is
 * open and has to leave with it, for the reason `HISTORY_TAB` gives one depth
 * up: nothing else on this surface has a linter program.
 */
export const EXAMPLES_TAB = 'examples';
export const LINTER_TAB = 'linter';

/**
 * The tabs that exist only while a component is open. Closing the component
 * has to take them out of the address as well as off the screen, or the next
 * component opened from that package inherits a tab the reader never picked.
 */
const COMPONENT_ONLY_TABS: ReadonlySet<string> = new Set([HISTORY_TAB]);

/** The same, one depth further in: the tabs only an open rule has. */
const RULE_ONLY_TABS: ReadonlySet<string> = new Set([LINTER_TAB]);

/** Whether this tab stops existing when the component closes. */
export function isComponentOnlyTab(value: string): boolean {
  return COMPONENT_ONLY_TABS.has(value);
}

/** Whether this tab stops existing when the rule closes. */
export function isRuleOnlyTab(value: string): boolean {
  return RULE_ONLY_TABS.has(value);
}

/** The default of each depth, which is what stays out of the address. */
const DEFAULT_TABS: ReadonlySet<string> = new Set([
  COMPONENTS_TAB,
  INSTRUCTIONS_TAB,
  EXAMPLES_TAB,
]);

/**
 * The tab the address asks for, read against what is on screen.
 *
 * Anything other than the one shared value reads as that depth's default rather
 * than as an error, so a hand-edited or truncated address answers with the
 * screen the reader already asked for.
 */
export function selectTab(
  requested: string | null,
  isComponentOpen: boolean,
): string {
  if (requested === DISTRIBUTION_TAB) return DISTRIBUTION_TAB;
  if (requested && isComponentOnlyTab(requested) && isComponentOpen) {
    return requested;
  }
  return isComponentOpen ? INSTRUCTIONS_TAB : COMPONENTS_TAB;
}

/**
 * The tab of the open rule the address asks for.
 *
 * Its own resolver rather than a third branch of `selectTab`, because the two
 * answer to different things being open and the parameter they read means the
 * innermost of them. Anything else reads as the rule's default, which is the
 * same forgiveness `selectTab` gives a hand-edited address.
 */
export function selectRuleTab(requested: string | null): string {
  return requested === LINTER_TAB ? LINTER_TAB : EXAMPLES_TAB;
}

/**
 * Whether selecting this tab should drop the parameter instead of writing it.
 *
 * Both defaults, not just the package's. Writing `?tab=instructions` would give
 * the plain reading of a component two addresses, and the one nobody links to
 * is the one that ends up pasted.
 */
export function isDefaultTab(value: string): boolean {
  return DEFAULT_TABS.has(value);
}

/**
 * Which types the pane can show itself, and the only place it is decided.
 *
 * All three types say yes now, and nothing on this surface leads out of it to
 * read a component any more: not a row in a package pane, not one in the space
 * inventory, not a search result in the rail, and not the frame's own header,
 * which no longer offers to open the page it was already showing.
 *
 * The per-type pages have one reader left, and it is not about reading: a
 * standard's rules are set up on the standard's page, and the link to that sits
 * beside the rules, named after the work. `href` is what carries it, which is
 * why the rows still have one.
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
 *
 * The package is nullable because half the rows that link here do not have one.
 * A row of a package pane knows which package it is being read in; a row of the
 * space inventory is one component and any number of packages, including none,
 * so it names the component and lets the surface resolve the rest. Naming no
 * package is not the same as leaving the parameter alone: the inventory is a
 * value of that same parameter, so a link out of it has to clear it or the pane
 * would answer with the list the reader just clicked out of.
 */
export function componentDetailHref(
  searchParams: URLSearchParams,
  packageId: PackageId | null,
  componentKey: string,
): string {
  const next = new URLSearchParams(searchParams);
  if (packageId) next.set(PACKAGE_PARAM, packageId);
  else next.delete(PACKAGE_PARAM);
  next.set(COMPONENT_PARAM, componentKey);
  // A file belongs to the component it was opened from, so a different
  // component cannot inherit it. Two skills can hold the same path. A rule is
  // the same question with a different answer: its id is unique, so the next
  // component would resolve it to nothing rather than to the wrong thing, and
  // an address naming a rule of a standard it is not in is still a lie.
  next.delete(FILE_PARAM);
  next.delete(RULE_PARAM);
  return `?${next.toString()}`;
}

/**
 * The address of the package with no component open in it.
 *
 * Separate from the href below because two callers want two shapes of the same
 * answer: a back link wants a string to navigate to, and a component that has
 * just been deleted wants the parameters themselves, to set in place. Both go
 * through here so the two cannot drift apart on what "no component open" means.
 */
export function packageDetailParams(
  searchParams: URLSearchParams,
  packageId: PackageId | typeof INVENTORY_VALUE,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.set(PACKAGE_PARAM, packageId);
  next.delete(COMPONENT_PARAM);
  next.delete(FILE_PARAM);
  next.delete(RULE_PARAM);
  /*
   * And the tab, when it was one only a component has. `selectTab` already
   * reads such a value as the package's default, so the screen would be right
   * either way; the address would not, and it is the address that gets pasted
   * and that the next component opened from here would inherit.
   */
  const tab = next.get(TAB_PARAM);
  if (tab && (isComponentOnlyTab(tab) || isRuleOnlyTab(tab))) {
    next.delete(TAB_PARAM);
  }
  return next;
}

/**
 * The way back out of a component that was read with no package: to the
 * inventory, which is the list it was opened from and the only list it appears
 * in.
 */
export function inventoryHref(searchParams: URLSearchParams): string {
  return `?${packageDetailParams(searchParams, INVENTORY_VALUE).toString()}`;
}

/** The way back out of a component, to the package it was read from. */
export function packageDetailHref(
  searchParams: URLSearchParams,
  packageId: PackageId,
): string {
  return `?${packageDetailParams(searchParams, packageId).toString()}`;
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
 * The Context surface of a space, opened on one component and on whichever
 * package turns out to hold it.
 *
 * A whole path like the builder above it, and for a sharper version of the same
 * reason: its callers are the component pages themselves, redirecting a reader
 * who arrived on an address from before this surface existed. A bookmark, a
 * link in an email, a link out of Review changes.
 *
 * It names no package, unlike the builder above, because the addresses it
 * replaces name none either. `selectContextPackage` answers that from the
 * component, which is what makes a component no package holds openable at all.
 *
 * The file is here rather than in a builder of its own because a skill's file
 * addresses are what people actually bookmark: the skill's own index sends them
 * to one, so `/skills/x/files/setup.md` is the address in the wild and it has
 * to land on that file and not on the skill's instructions.
 */
export function contextComponentHref(
  { orgSlug, spaceSlug }: ContextLinkTarget,
  componentKey: string,
  filePath?: string | null,
): string {
  const params = new URLSearchParams({ [COMPONENT_PARAM]: componentKey });
  if (filePath) {
    params.set(FILE_PARAM, filePath);
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

/**
 * The address of one rule of the standard that is already open.
 *
 * It names no component, only the rule, for the reason `componentFileHref`
 * gives: the list these links are built from is the open standard's own, so a
 * link that could name another component would be a link that can lie about
 * which standard the rule belongs to.
 */
export function componentRuleHref(
  searchParams: URLSearchParams,
  ruleId: string,
): string {
  const next = new URLSearchParams(searchParams);
  next.set(RULE_PARAM, ruleId);
  return `?${next.toString()}`;
}

/** The way back from a file or a rule to the component that carries it. */
export function componentEntryHref(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  next.delete(FILE_PARAM);
  next.delete(RULE_PARAM);
  /*
   * And the tab, when it was one only a rule has, for the reason
   * `packageDetailParams` deletes a component's: the screen would be right
   * either way, since `selectTab` reads an unknown value as the depth's
   * default, but the address would say the reader is somewhere they are not.
   */
  const tab = next.get(TAB_PARAM);
  if (tab && isRuleOnlyTab(tab)) {
    next.delete(TAB_PARAM);
  }
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
 * The rule the address asks for, or null to show the standard itself.
 *
 * Resolved against the rules the query returned, the way a file is, so a rule
 * that has been deleted or renamed out of the standard falls back to the
 * standard's own body instead of an empty frame.
 */
export function selectStandardRule<Rule extends { id: string }>(
  rules: readonly Rule[],
  requested: string | null,
): Rule | null {
  if (!requested) return null;
  return rules.find((rule) => rule.id === requested) ?? null;
}

/**
 * A row pointed at the pane itself when the pane can show what it points to.
 *
 * The rewrite happens here rather than in `buildPackageContext` because that
 * builder answers what a package holds, and the rows it builds are read in
 * three places that do not agree on where a click should land. Two of them do
 * now: a row of a package pane and a search result in the rail both open in the
 * pane, the first inside the package it is listed under and the second inside
 * the package it was found in.
 *
 * The third is the space inventory, which has no package to name, hence the
 * null. A component listed there sits in any number of packages, and the point
 * of the list is that the number can be zero.
 */
export function withPaneDetailHref(
  component: ContextComponent,
  searchParams: URLSearchParams,
  packageId: PackageId | null,
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
 * The component the address names, resolved against the whole space instead of
 * against one package's contents.
 *
 * `selectDetailComponent` answers the same question inside a package and cannot
 * answer it at all for a component no package carries. Those exist and are not
 * a corner case: a standard arrives from a repository before anyone sorts it,
 * and a component outlives the packages that referenced it. In the plugin-first
 * navigation the space inventory is the only list they appear in, so the pane
 * has to be able to open one from there.
 *
 * The same rule about a type the pane cannot render, for the same reason and so
 * that the two resolvers cannot disagree: it reads as no request at all.
 */
export function findSpaceComponent(
  catalogue: SpaceCatalogue,
  requested: string | null,
  target: ContextLinkTarget,
): ContextComponent | null {
  if (!requested) return null;

  const standard = catalogue.standards.find(
    (entity) => entity.id === requested,
  );
  if (standard) return renderableInPane(standardToComponent(standard, target));

  const command = catalogue.commands.find((entity) => entity.id === requested);
  if (command) return renderableInPane(commandToComponent(command, target));

  const skill = catalogue.skills.find((entity) => entity.id === requested);
  if (skill) return renderableInPane(skillToComponent(skill, target));

  return null;
}

function renderableInPane(
  component: ContextComponent,
): ContextComponent | null {
  return RENDERS_IN_PANE[component.type] ? component : null;
}

/**
 * The package the pane reads the open component in, which the address does not
 * always say.
 *
 * Three answers, in the order of how explicit the address is.
 *
 * A named package wins, even when it does not hold the component. The address
 * says which package, and `selectDetailComponent` then answers with that
 * package's list, which is exactly what the moment after a successful move
 * looks like.
 *
 * Failing that, the component decides. An address naming only a component is
 * what the inventory's rows carry, and what a bookmark from before this surface
 * existed will carry: it has to open somewhere, and the somewhere is the first
 * package holding it in the order the rail lists them. First rather than a
 * choice offered to the reader, because a component in two packages is read the
 * same way in both and the header names the one it landed in.
 *
 * Null when no package holds it. Not the first package of the space, which
 * would put a back link into a package that does not hold what is on screen,
 * beside an offer to remove the component from it.
 */
export function selectContextPackage<
  Pkg extends PackageComponentIds & { id: PackageId },
>(
  packages: readonly Pkg[],
  requestedPackageId: string | null,
  component: Pick<ContextComponent, 'type' | 'key'> | null,
): Pkg | null {
  const named = packages.find((pkg) => pkg.id === requestedPackageId);
  if (named) return named;

  if (component) {
    return (
      packages.find((pkg) => packageHoldsComponent(pkg, component)) ?? null
    );
  }

  return packages[0] ?? null;
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
