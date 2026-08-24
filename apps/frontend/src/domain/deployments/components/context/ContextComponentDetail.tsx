import { Link } from 'react-router';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMMarkdownViewer,
  PMSpinner,
  PMText,
} from '@packmind/ui';
import { LuChevronLeft } from 'react-icons/lu';
import type { CommandId } from '@packmind/types';
import { useGetCommandByIdQuery } from '../../../commands/api/queries/CommandsQueries';
import type { ContextComponent } from './buildPackageContext';
import { COMPONENT_TYPE_LABELS_SINGULAR } from './buildPackageContext';
import { COMPONENT_TYPE_ICONS } from './ContextComponentList';

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
}: Readonly<{
  component: ContextComponent;
  packageName: string;
  /** The package this component was opened from, tab and all. */
  backHref: string;
  /** Null for a type with no edit route of its own. */
  editHref: string | null;
  onMove: () => void;
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
          {component.summary && (
            <PMText as="div" color="secondary" paddingTop={2}>
              {component.summary}
            </PMText>
          )}
        </PMBox>

        <PMHStack gap={2} flexShrink={0}>
          {/*
            The way out to everything the pane does not carry yet: version
            history, distributions of this one component, deletion, change
            proposals. It keeps its own label rather than saying "Open page",
            so the button says what will be on screen.

            Secondary, the same weight as the pane's own "Open package": both
            are the way out of this surface to a page that still holds more.
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
    /*
     * The two types whose body is not written yet. Unreachable rather than
     * hidden: their rows still point at their own page, which is what the
     * `false` entries of `RENDERS_IN_PANE` say. Null so that an address typed
     * by hand shows the frame instead of crashing the surface.
     */
    case 'standard':
    case 'skill':
      return null;
  }
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
