import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMIconButton,
  PMMarkdownViewer,
  PMMenu,
  PMPortal,
  PMSpinner,
  PMTabsCompound,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronLeft, LuEllipsisVertical, LuTrash2 } from 'react-icons/lu';
import type {
  CommandId,
  OrganizationId,
  Rule,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetCommandByIdQuery } from '../../../commands/api/queries/CommandsQueries';
import { useGetSkillWithFilesByIdQuery } from '../../../skills/api/queries/SkillsQueries';
import { SkillFrontmatterInfo } from '../../../skills/components/SkillFrontmatterInfo';
import { CommandFrontmatterInfo } from '../../../commands/components/CommandFrontmatterInfo';
import { parseCommandFrontmatter } from '../../../commands/utils/parseCommandFrontmatter';
import {
  useGetRulesByStandardIdQuery,
  useGetStandardByIdQuery,
} from '../../../standards/api/queries/StandardsQueries';
import {
  DISTRIBUTION_TAB,
  INSTRUCTIONS_TAB,
  sortRulesByContent,
} from './buildComponentDetail';
import type { ContextComponent } from './buildPackageContext';
import { COMPONENT_TYPE_LABELS_SINGULAR } from './buildPackageContext';
import {
  COMPONENT_ACTION_ICONS,
  COMPONENT_TYPE_ICONS,
} from './ContextComponentList';
import {
  useListCommandDistributionsQuery,
  useListSkillDistributionsQuery,
  useListStandardDistributionsQuery,
} from '../../api/queries/DeploymentsQueries';
import { CommandDistributionsList } from '../CommandDistributionsList/CommandDistributionsList';
import { SkillDistributionsList } from '../SkillDistributionsList/SkillDistributionsList';
import { StandardDistributionsList } from '../StandardDistributionsList/StandardDistributionsList';

/**
 * One component, read inside the package that carries it.
 *
 * The frame is the same for every type: where it comes from, what it is, what
 * can be done to it. Only the tab bodies change, and which body to render is
 * the one thing this file decides per type. A new type is a new case in
 * `ComponentBody`, a new case in `ComponentDistribution`, and a flipped entry
 * in `RENDERS_IN_PANE`, not a new screen.
 *
 * It replaces the package's tab strip with one of its own rather than sitting
 * under it: Content and Distribution are two ways of reading the package, and
 * neither is what is on screen while a component is open. The back link is what
 * says so, and it names the package rather than saying "Back", because that is
 * the information.
 */
export function ContextComponentDetail({
  component,
  packageName,
  backHref,
  editHref,
  tab,
  onTabChange,
  orgSlug,
  spaceSlug,
  onMove,
  onRemove,
  onDelete,
}: Readonly<{
  component: ContextComponent;
  packageName: string;
  /** The package this component was opened from, tab and all. */
  backHref: string;
  /** Null for a type with no edit route of its own. */
  editHref: string | null;
  /**
   * Which of the two tabs is open. Owned by the pane rather than read here,
   * for the reason every other link on this frame is handed in already built:
   * this component does not touch the address, so it cannot drop a parameter
   * the surface put there.
   */
  tab: string;
  onTabChange: (value: string) => void;
  /** Both slugs, for the distribution lists, which link out to destinations. */
  orgSlug: string;
  spaceSlug: string;
  onMove: () => void;
  /**
   * Taking this component out of the package named in the back link, which is
   * where the reader lands once it is gone from here.
   */
  onRemove: () => void;
  onDelete: () => void;
}>) {
  const label = COMPONENT_TYPE_LABELS_SINGULAR[component.type];

  return (
    /*
     * The same arrangement the package pane uses: header and strip held in
     * place, only the tab body below them moving. Laid out here rather than by
     * the pane, so the frame owns its own scroll and the pane hands it a slot.
     */
    <PMTabsCompound.Root
      value={tab}
      onValueChange={(details) => onTabChange(details.value)}
      variant="line"
      height="100%"
      minH={0}
      display="flex"
      flexDirection="column"
      lazyMount
      unmountOnExit
    >
      <PMBox paddingX={6} paddingTop={6} flexShrink={0}>
        <PMBox
          display="inline-flex"
          alignItems="center"
          gap="4px"
          fontSize="sm"
          color="text.faded"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          asChild
        >
          <Link to={backHref}>
            <PMIcon fontSize="sm">
              <LuChevronLeft />
            </PMIcon>
            {packageName}
          </Link>
        </PMBox>

        <PMHStack align="start" justify="space-between" gap={6} paddingTop={2}>
          <PMBox minW={0} maxWidth="68ch">
            <PMHeading level="h2">{component.name}</PMHeading>
            <PMHStack gap={2} paddingTop={2} align="center" wrap="wrap">
              <PMHStack gap="6px" align="center">
                <PMIcon fontSize="xs" color="text.faded">
                  {COMPONENT_TYPE_ICONS[component.type]}
                </PMIcon>
                <PMText fontSize="sm" color="secondary">
                  {label}
                </PMText>
              </PMHStack>
              <PMText fontSize="sm" color="faded" aria-hidden>
                ·
              </PMText>
              <PMText fontSize="sm" color="faded">
                v{component.version}
              </PMText>
              {/*
              No repository count here. Where a component landed is a property of
              the package, one level up, and printing it on the component is
              what used to make people think a component is distributed alone.
            */}
            </PMHStack>
            {/*
            And no summary either. For a standard and a skill the row's summary
            is the entity's description, which is the first thing the body below
            prints: on screen it read as the same paragraph twice.
          */}
          </PMBox>

          <PMHStack gap={2} flexShrink={0}>
            {/*
            The way out to everything the pane does not carry yet: version
            history and change proposals. Distributions left this list the day
            the tab below arrived. It keeps its own label rather than saying
            "Open page", so the button says what will be on screen.

            It is on its way out. While it is here no reader loses anything to
            a half-absorbed frame, which is the only reason it survived the
            arrival of the tab strip.

            Secondary, because reading the component is what this screen is
            for. The package header used to carry a button like it and no longer
            does: everything its page held is on this surface now. A component's
            page is not, which is why this one is still here.
          */}
            <PMButton variant="secondary" size="sm" asChild>
              <Link to={component.href}>{`Open ${label.toLowerCase()}`}</Link>
            </PMButton>
            <PMButton variant="secondary" size="sm" onClick={onMove}>
              Move
            </PMButton>
            {editHref && (
              <PMButton variant="primary" size="sm" asChild>
                <Link to={editHref}>Edit</Link>
              </PMButton>
            )}
            {/*
            Deleting, behind a menu for the same reason the package's own
            deletion is: it is the one action here that destroys what the screen
            is showing, and it should not sit one stray click away from Edit.

            It was only reachable from the component's own page until now, which
            made deleting the one maintenance task that forced the reader out of
            this surface.
          */}
            <PMMenu.Root>
              <PMMenu.Trigger asChild>
                <PMIconButton
                  aria-label={`More actions for ${component.name}`}
                  variant="tertiary"
                  size="sm"
                >
                  <LuEllipsisVertical />
                </PMIconButton>
              </PMMenu.Trigger>
              <PMPortal>
                <PMMenu.Positioner>
                  <PMMenu.Content>
                    {/*
                    Above the deletion and not coloured like it, because the two
                    are one word apart and only one of them destroys anything:
                    this one takes the component out of one package, the other
                    takes it out of the space.
                  */}
                    <PMMenu.Item value="remove-component" onClick={onRemove}>
                      <PMHStack gap={2}>
                        <PMIcon>{COMPONENT_ACTION_ICONS.remove}</PMIcon>
                        Remove from package
                      </PMHStack>
                    </PMMenu.Item>
                    <PMMenu.Item
                      value="delete-component"
                      color="text.error"
                      onClick={onDelete}
                    >
                      <PMHStack gap={2}>
                        <PMIcon>
                          <LuTrash2 />
                        </PMIcon>
                        {`Delete ${label.toLowerCase()}`}
                      </PMHStack>
                    </PMMenu.Item>
                  </PMMenu.Content>
                </PMMenu.Positioner>
              </PMPortal>
            </PMMenu.Root>
          </PMHStack>
        </PMHStack>

        {/*
          No divider under the header any more. The strip's own line is the
          separation, and two rules a few pixels apart read as a mistake.
        */}
        <PMBox paddingTop={5}>
          <PMTabsCompound.List>
            <PMTabsCompound.Trigger value={INSTRUCTIONS_TAB}>
              Instructions
            </PMTabsCompound.Trigger>
            <PMTabsCompound.Trigger value={DISTRIBUTION_TAB}>
              Distribution
              {/*
                A plain number and not a badge, the same as the package's own
                Components count: this is the size of the half you are not
                looking at, not something to go and fix. The coloured badge on
                the package's Distribution tab means the opposite, and the two
                must not be confused for each other.
              */}
              <DistributionCount component={component} />
            </PMTabsCompound.Trigger>
          </PMTabsCompound.List>
        </PMBox>
      </PMBox>

      <PMTabsCompound.Content
        value={INSTRUCTIONS_TAB}
        flex="1"
        minH={0}
        overflowY="auto"
        paddingX={6}
        paddingY={5}
      >
        <ComponentBody component={component} />
      </PMTabsCompound.Content>

      <PMTabsCompound.Content
        value={DISTRIBUTION_TAB}
        flex="1"
        minH={0}
        overflowY="auto"
        paddingX={6}
        paddingY={5}
      >
        <ComponentDistribution
          component={component}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      </PMTabsCompound.Content>
    </PMTabsCompound.Root>
  );
}

function ComponentBody({
  component,
}: Readonly<{ component: ContextComponent }>) {
  switch (component.type) {
    case 'command':
      return <CommandBody commandId={component.key as CommandId} />;
    case 'standard':
      return <StandardBody standardId={component.key as StandardId} />;
    case 'skill':
      return <SkillBody skillId={component.key as SkillId} />;
  }
}

/** The heading of a section inside a body, the same in every type. */
function BodySectionLabel({ children }: Readonly<{ children: string }>) {
  return (
    <PMText
      as="div"
      fontSize="10px"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wider"
      color="faded"
    >
      {children}
    </PMText>
  );
}

/**
 * How many places this one component reached, on the tab that lists them.
 *
 * Per type rather than one call with a switch inside it, for the reason the
 * bodies below are: a hook cannot be called conditionally, and the three
 * queries take three different ids. One component per type calls exactly one.
 *
 * It sits on the trigger rather than in the body, so it is outside the lazy
 * mount and answers before the tab is ever opened. That is the whole point of
 * it: whether a component has been distributed at all is the question a reader
 * has before they decide to look.
 */
function DistributionCount({
  component,
}: Readonly<{ component: ContextComponent }>) {
  switch (component.type) {
    case 'command':
      return (
        <CommandDistributionCount commandId={component.key as CommandId} />
      );
    case 'standard':
      return (
        <StandardDistributionCount standardId={component.key as StandardId} />
      );
    case 'skill':
      return <SkillDistributionCount skillId={component.key as SkillId} />;
  }
}

/**
 * The number itself, or nothing at all.
 *
 * Nothing rather than a zero: a component that has not been distributed is the
 * ordinary state of one just written, and a "0" on the tab reads as a count
 * that failed to load. The tab body says it in words instead.
 */
function TabCount({ value }: Readonly<{ value: number | undefined }>) {
  if (!value) return null;

  return (
    <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
      {value}
    </PMText>
  );
}

function CommandDistributionCount({
  commandId,
}: Readonly<{ commandId: CommandId }>) {
  const { data } = useListCommandDistributionsQuery(commandId);
  return <TabCount value={data?.length} />;
}

function StandardDistributionCount({
  standardId,
}: Readonly<{ standardId: StandardId }>) {
  const { data } = useListStandardDistributionsQuery(standardId);
  return <TabCount value={data?.length} />;
}

function SkillDistributionCount({ skillId }: Readonly<{ skillId: SkillId }>) {
  const { data } = useListSkillDistributionsQuery(skillId);
  return <TabCount value={data?.length} />;
}

/**
 * Where this one component went, and under what name an agent reads it.
 *
 * A different question from the package's own Distribution tab, which asks
 * whether a whole set of components reached a set of repositories. This one
 * asks where a single file can be found, and it is the question that used to
 * force a reader onto the component's own page.
 */
function ComponentDistribution({
  component,
  orgSlug,
  spaceSlug,
}: Readonly<{
  component: ContextComponent;
  orgSlug: string;
  spaceSlug: string;
}>) {
  switch (component.type) {
    case 'command':
      return (
        <CommandDistribution
          commandId={component.key as CommandId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      );
    case 'standard':
      return (
        <StandardDistribution
          standardId={component.key as StandardId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      );
    case 'skill':
      return (
        <SkillDistribution
          skillId={component.key as SkillId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      );
  }
}

/**
 * The path a coding agent reads this component from.
 *
 * Named as the Packmind one rather than as "the" path, because it is not the
 * only one: every render mode writes the same component somewhere of its own,
 * and calling one of them the path is exactly the smoothing of agent
 * differences the product exists to refuse. The list below names the formats
 * each destination received.
 *
 * No scope line beside it. A standard's scope is a property of the standard and
 * is already the first thing its Instructions tab prints; a command's is the
 * literal `**\/*` for every command there is, which is not information.
 */
function DistributedAs({ path }: Readonly<{ path: string }>) {
  return (
    <PMBox>
      <BodySectionLabel>Distributed as</BodySectionLabel>
      <PMText as="div" fontSize="sm" fontFamily="mono" paddingTop={1}>
        {path}
      </PMText>
      <PMText as="div" fontSize="xs" color="secondary" paddingTop={1}>
        The Packmind path. Each agent reads this component from one of its own.
      </PMText>
    </PMBox>
  );
}

/**
 * The frame the three types share: the path, then either the landings or the
 * reason there are none.
 *
 * The path is conditional and carries no spinner of its own on purpose. It
 * needs the entity only for a slug, and a failed slug must not empty a tab
 * whose subject is the list underneath it.
 *
 * The count decides which half renders, and `undefined` is not zero: while the
 * query is in flight nothing is claimed, so the list stands with its own
 * spinner and neither the empty state nor the scope line flashes on the way in.
 */
function DistributionBody({
  path,
  count,
  children,
}: Readonly<{
  path: string | null;
  /** Undefined while the landings are still being fetched. */
  count: number | undefined;
  children: ReactNode;
}>) {
  if (count === 0) {
    return (
      <PMVStack gap={6} align="stretch" maxWidth="72ch">
        {path && <DistributedAs path={path} />}
        {/*
          Not `DeploymentsHistory`'s own empty state, which is centred, bold,
          and reads as a query that failed. Nothing failed here: this is the
          ordinary state of a component just written, and the line says what
          would send it rather than reporting an absence.
        */}
        <PMText as="div" fontSize="sm" color="secondary">
          Not distributed yet. A component travels inside a package, so
          distributing a package that carries this one is what sends it.
        </PMText>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="stretch">
      {path && <DistributedAs path={path} />}
      <PMVStack gap={2} align="stretch">
        {/*
          Said because the frame around it says something else. The back link
          names the package the component was opened from, and these rows can
          name a different one: a component sits in several packages, and this
          is every landing of it rather than the ones this package caused.
          Filtering to the open package would be the alternative, and it would
          hide real landings.

          Held back until the count is known, so it does not appear above a
          spinner that resolves to nothing.
        */}
        {count !== undefined && (
          <PMText as="div" fontSize="xs" color="secondary">
            Every landing of this component, whichever package sent it. The
            Package column says which.
          </PMText>
        )}
        {children}
      </PMVStack>
    </PMVStack>
  );
}

function CommandDistribution({
  commandId,
  orgSlug,
  spaceSlug,
}: Readonly<{ commandId: CommandId; orgSlug: string; spaceSlug: string }>) {
  const { data: command } = useGetCommandByIdQuery(commandId);
  /*
   * The same query the tab's own count runs, by the same id, so React Query
   * answers both from one request. Asked for here because the frame needs the
   * number to decide which half of itself to render, and the list below it
   * cannot report upward.
   */
  const { data: landings } = useListCommandDistributionsQuery(commandId);

  return (
    <DistributionBody
      path={command?.slug ? `.packmind/recipes/${command.slug}.md` : null}
      count={landings?.length}
    >
      <CommandDistributionsList
        recipeId={commandId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    </DistributionBody>
  );
}

function StandardDistribution({
  standardId,
  orgSlug,
  spaceSlug,
}: Readonly<{ standardId: StandardId; orgSlug: string; spaceSlug: string }>) {
  const { data } = useGetStandardByIdQuery(standardId);
  const slug = data?.standard?.slug;
  const { data: landings } = useListStandardDistributionsQuery(standardId);

  return (
    <DistributionBody
      path={slug ? `.packmind/standards/${slug}.md` : null}
      count={landings?.length}
    >
      <StandardDistributionsList
        standardId={standardId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    </DistributionBody>
  );
}

/**
 * A skill is a folder, so its path is one, trailing slash and all. The files
 * inside it are the rail, which is where they belong: this tab is about where
 * the folder landed, not what is in it.
 */
function SkillDistribution({
  skillId,
  orgSlug,
  spaceSlug,
}: Readonly<{ skillId: SkillId; orgSlug: string; spaceSlug: string }>) {
  const { data } = useGetSkillWithFilesByIdQuery(skillId);
  const slug = data?.latestVersion.slug;
  const { data: landings } = useListSkillDistributionsQuery(skillId);

  return (
    <DistributionBody
      path={slug ? `.packmind/skills/${slug}/` : null}
      count={landings?.length}
    >
      <SkillDistributionsList
        skillId={skillId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    </DistributionBody>
  );
}

/**
 * A command is what it declares and what it says to do, read in that order, the
 * same as a skill. Unlike a skill, it carries both in one string: nothing on the
 * command splits the frontmatter off, so the split happens here.
 *
 * It has to happen somewhere. A closing `---` under a `description:` line is a
 * setext heading, so a command handed to the Markdown viewer whole came out with
 * its frontmatter as the largest title on the page.
 *
 * Fetched by id rather than read from the space catalogue the pane already
 * holds: this is the same query the command's own page runs, so opening one
 * from here and opening it there share a cache entry and cannot disagree about
 * what the content is.
 */
function CommandBody({ commandId }: Readonly<{ commandId: CommandId }>) {
  const {
    data: command,
    isLoading,
    isError,
  } = useGetCommandByIdQuery(commandId);

  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" paddingY={10}>
        <PMSpinner />
      </PMBox>
    );
  }

  if (isError || !command) {
    return <PMText color="error">Error loading this command.</PMText>;
  }

  if (!command.content) {
    return (
      <PMText color="secondary">
        This command has no instructions yet. An empty command tells a coding
        agent nothing, and it is distributed all the same.
      </PMText>
    );
  }

  const frontmatter = parseCommandFrontmatter(command.content);

  return (
    <PMVStack gap={6} align="stretch" maxWidth="72ch">
      <CommandFrontmatterInfo frontmatter={frontmatter} />

      {frontmatter.body ? (
        <PMBox>
          <PMMarkdownViewer content={frontmatter.body} />
        </PMBox>
      ) : (
        <PMText color="secondary">
          This command declares itself and stops there. Its frontmatter tells a
          coding agent when to reach for it, and nothing tells it what to do
          once it has.
        </PMText>
      )}
    </PMVStack>
  );
}

/**
 * A standard is prose plus the rules it breaks down into. Both, because either
 * one alone misreads it: the prose without the rules is an intention nobody
 * checks, and the rules without the prose are a checklist with no reason.
 *
 * The scope leads, when the standard has one. It is not in the prototype's
 * standard body, but it is the line that says where the standard applies, and
 * the pane is on its way to being the only place a standard is read.
 */
function StandardBody({ standardId }: Readonly<{ standardId: StandardId }>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const { data, isLoading, isError } = useGetStandardByIdQuery(standardId);
  // The endpoint answers with an envelope, and null inside it for a standard
  // that is gone. Both cases land in the same branch below.
  const standard = data?.standard ?? null;

  /*
   * The rules are a query of their own, as they are on the standard's page: the
   * standard carries its prose, never its rules. The casts follow that page,
   * where the query is disabled until both ids exist.
   */
  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useGetRulesByStandardIdQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standardId,
  );

  const sortedRules = useMemo(
    () => (rules ? sortRulesByContent(rules) : []),
    [rules],
  );

  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" paddingY={10}>
        <PMSpinner />
      </PMBox>
    );
  }

  if (isError || !standard) {
    return <PMText color="error">Error loading this standard.</PMText>;
  }

  return (
    <PMVStack gap={6} align="stretch" maxWidth="72ch">
      {standard.scope && (
        <PMBox>
          <BodySectionLabel>Scope</BodySectionLabel>
          <PMText as="div" fontSize="sm" fontFamily="mono" paddingTop={1}>
            {standard.scope}
          </PMText>
        </PMBox>
      )}

      {standard.description && (
        <PMBox>
          <PMMarkdownViewer content={standard.description} />
        </PMBox>
      )}

      <PMBox>
        {/*
          The count only when there is one to give: loading, failed and empty
          all read better as the plain heading, and "0 rules" above a line that
          already says there is no rule was saying it twice.
        */}
        <BodySectionLabel>
          {sortedRules.length > 0
            ? `${sortedRules.length} rule${sortedRules.length === 1 ? '' : 's'}`
            : 'Rules'}
        </BodySectionLabel>
        <PMBox paddingTop={1}>
          <RulesSection
            rules={sortedRules}
            isLoading={rulesLoading}
            isError={rulesError}
          />
        </PMBox>
      </PMBox>
    </PMVStack>
  );
}

/**
 * The rules of a standard, as a list rather than the table its page uses.
 *
 * The table is not reusable here: it carries a linter status column of its own
 * and builds its links from the route parameters of the standard's page, which
 * the pane does not have. A row is not a link for the same reason the prototype
 * does not make it one — a rule opens on that page, and the way there is the
 * button in the header that says so.
 */
function RulesSection({
  rules,
  isLoading,
  isError,
}: Readonly<{
  rules: readonly Rule[];
  isLoading: boolean;
  isError: boolean;
}>) {
  if (isLoading) {
    return (
      <PMText fontSize="sm" color="faded">
        Loading rules…
      </PMText>
    );
  }

  if (isError) {
    return <PMText color="error">Failed to load the rules.</PMText>;
  }

  if (rules.length === 0) {
    return (
      <PMText as="div" fontSize="sm" color="secondary">
        No rule yet. The prose still reaches the coding agent, but nothing in
        this standard can be checked against a change.
      </PMText>
    );
  }

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
    >
      {rules.map((rule, index) => (
        <PMBox
          key={rule.id}
          paddingX={3}
          paddingY="10px"
          borderTopWidth={index === 0 ? '0' : '1px'}
          borderColor="border.tertiary"
        >
          <PMText fontSize="sm">{rule.content}</PMText>
        </PMBox>
      ))}
    </PMBox>
  );
}

/**
 * A skill is a folder: what it declares, what it says to do, and the files that
 * ship beside it. Read in that order, which is the order an agent reads them
 * in — the frontmatter is what decides whether the instructions are opened at
 * all.
 *
 * The frontmatter is the skill page's own component rather than a second
 * rendering of it. `metadata` and `additionalProperties` are open-ended, and a
 * skill declaring something this pane had never heard of would be the kind of
 * disagreement nobody notices until the agent behaves differently from what the
 * page showed.
 */
function SkillBody({ skillId }: Readonly<{ skillId: SkillId }>) {
  const { data, isLoading, isError } = useGetSkillWithFilesByIdQuery(skillId);

  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" paddingY={10}>
        <PMSpinner />
      </PMBox>
    );
  }

  /*
   * Null rather than an error for a skill that is gone, the same as the other
   * two bodies: the row it was opened from came from a list that had it, so by
   * the time this fails there is nothing useful to say beyond that it failed.
   */
  if (isError || !data) {
    return <PMText color="error">Error loading this skill.</PMText>;
  }

  const { latestVersion } = data;

  return (
    <PMVStack gap={6} align="stretch" maxWidth="72ch">
      <SkillFrontmatterInfo skillVersion={latestVersion} />

      {latestVersion.prompt ? (
        <PMBox>
          <PMMarkdownViewer content={latestVersion.prompt} />
        </PMBox>
      ) : (
        <PMText color="secondary">
          This skill has no instructions yet. Its frontmatter tells a coding
          agent when to reach for it, and nothing tells it what to do once it
          has.
        </PMText>
      )}

      {/*
        No list of files here. The surface reads the same query and turns the
        rail into this skill's file tree whenever there is one, so a list in the
        body would be the same folder printed twice, and the copy without links
        would be the one people clicked at.
      */}
    </PMVStack>
  );
}
