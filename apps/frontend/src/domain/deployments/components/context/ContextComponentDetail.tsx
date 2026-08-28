import { useMemo } from 'react';
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
import {
  useGetRulesByStandardIdQuery,
  useGetStandardByIdQuery,
} from '../../../standards/api/queries/StandardsQueries';
import { sortRulesByContent } from './buildComponentDetail';
import type { ContextComponent } from './buildPackageContext';
import { COMPONENT_TYPE_LABELS_SINGULAR } from './buildPackageContext';
import {
  COMPONENT_ACTION_ICONS,
  COMPONENT_TYPE_ICONS,
} from './ContextComponentList';

/**
 * One component, read inside the package that carries it.
 *
 * The frame is the same for every type: where it comes from, what it is, what
 * can be done to it. Only the body below the divider changes, and which body to
 * render is the one thing this file decides per type. A new type is a new case
 * in `ComponentBody` and a flipped entry in `RENDERS_IN_PANE`, not a new screen.
 *
 * It replaces the package's tab strip rather than sitting under it: Content and
 * Distribution are two ways of reading the package, and neither is what is on
 * screen while a component is open. The back link is what says so, and it names
 * the package rather than saying "Back", because that is the information.
 */
export function ContextComponentDetail({
  component,
  packageName,
  backHref,
  editHref,
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
    <PMBox padding={6}>
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
            history, distributions of this one component, deletion, change
            proposals. It keeps its own label rather than saying "Open page",
            so the button says what will be on screen.

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

      <PMBox
        marginTop={5}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        paddingTop={5}
      >
        <ComponentBody component={component} />
      </PMBox>
    </PMBox>
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
 * A command is its instructions. One body section, no frontmatter and no file
 * list, because a command has neither.
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
        This command has no instructions yet. An empty command tells an agent
        nothing, and it is distributed all the same.
      </PMText>
    );
  }

  return (
    <PMBox maxWidth="72ch">
      <PMMarkdownViewer content={command.content} />
    </PMBox>
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
        Loading rules...
      </PMText>
    );
  }

  if (isError) {
    return <PMText color="error">Failed to load the rules.</PMText>;
  }

  if (rules.length === 0) {
    return (
      <PMText as="div" fontSize="sm" color="secondary">
        No rule yet. The prose still reaches the agent, but nothing in this
        standard can be checked against a change.
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
          This skill has no instructions yet. Its frontmatter tells an agent
          when to reach for it, and nothing tells it what to do once it has.
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
