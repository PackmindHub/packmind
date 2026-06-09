import type { UserSpaceWithRole } from '@packmind/types';
import { PMBox, PMSeparator, PMText, PMTooltip } from '@packmind/ui';
import { SpaceNavBlock } from '../../organizations/components/sidebar/SpaceNavBlock';
import { useSidebarCollapse } from '../../organizations/components/SidebarCollapseContext';
import { sortSpacesByName } from '../utils/sortSpacesByName';

const MAX_UNPINNED_SIDEBAR_SPACES = 3;

interface CustomSpacesNavBlockProps {
  spaces: UserSpaceWithRole[];
  orgSlug: string;
  currentSpaceSlug: string | undefined;
  selectedSpaceId: string | null;
  onSpaceClick: (space: UserSpaceWithRole) => void;
  onBrowseMySpaces?: () => void;
}

export function CustomSpacesNavBlock({
  spaces,
  orgSlug,
  currentSpaceSlug,
  selectedSpaceId,
  onSpaceClick,
  onBrowseMySpaces,
}: Readonly<CustomSpacesNavBlockProps>): React.ReactElement {
  const { isCollapsed } = useSidebarCollapse();
  const customSpaces = spaces.filter((space) => !space.isDefaultSpace);
  const pinnedSpaces = sortSpacesByName(
    customSpaces.filter((space) => space.pinned),
  );
  const sortedUnpinned = sortSpacesByName(
    customSpaces.filter((space) => !space.pinned),
  );
  const visibleUnpinned = sortedUnpinned.slice(0, MAX_UNPINNED_SIDEBAR_SPACES);

  // Ensure the currently active space is always visible in the sidebar
  const activeSpaceHidden =
    currentSpaceSlug &&
    !pinnedSpaces.some((s) => s.slug === currentSpaceSlug) &&
    !visibleUnpinned.some((s) => s.slug === currentSpaceSlug);
  const hiddenActiveSpace = activeSpaceHidden
    ? sortedUnpinned.find((s) => s.slug === currentSpaceSlug)
    : undefined;

  const unpinnedSpaces = hiddenActiveSpace
    ? [...visibleUnpinned, hiddenActiveSpace]
    : visibleUnpinned;

  const hasNoCustomSpaces = customSpaces.length === 0;

  return (
    <>
      {pinnedSpaces.length > 0 && (
        <>
          {!isCollapsed && (
            <PMBox px={3} pt={3} pb={1}>
              <PMText fontSize="2xs" fontWeight="semibold" color="faded">
                Favorites
              </PMText>
            </PMBox>
          )}
          {pinnedSpaces.map((space) => (
            <SpaceNavBlock
              key={space.id}
              space={space}
              orgSlug={orgSlug}
              isActive={space.slug === currentSpaceSlug}
              isSelected={space.id === selectedSpaceId}
              onSpaceClick={() => onSpaceClick(space)}
            />
          ))}
        </>
      )}
      {isCollapsed ? (
        pinnedSpaces.length > 0 &&
        unpinnedSpaces.length > 0 && (
          <PMSeparator borderColor="border.primary" my={2} mx={2} />
        )
      ) : (
        <PMBox
          px={3}
          pt={3}
          pb={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <PMText fontSize="2xs" fontWeight="semibold" color="faded">
            My spaces
          </PMText>
          {onBrowseMySpaces && (
            <PMBox
              as="button"
              fontSize="10px"
              color="text.faded"
              cursor="pointer"
              _hover={{ color: 'text.primary' }}
              transition="color 0.15s"
              onClick={onBrowseMySpaces}
              data-testid="browse-my-spaces-trigger"
            >
              Browse
            </PMBox>
          )}
        </PMBox>
      )}
      {unpinnedSpaces.map((space) => (
        <SpaceNavBlock
          key={space.id}
          space={space}
          orgSlug={orgSlug}
          isActive={space.slug === currentSpaceSlug}
          isSelected={space.id === selectedSpaceId}
          onSpaceClick={() => onSpaceClick(space)}
        />
      ))}
      {!isCollapsed && hasNoCustomSpaces && (
        <PMBox px={3} pt={1} pb={2}>
          <PMText fontSize="xs" color="tertiary">
            Browse to discover{' '}
            <PMTooltip label='Organize your playbook by team, project, or language. E.g. "Backend", "Frontend", "Security".'>
              <PMBox
                as="span"
                textDecoration="underline"
                textDecorationStyle="dotted"
                cursor="help"
              >
                spaces
              </PMBox>
            </PMTooltip>{' '}
            or create your own.
          </PMText>
        </PMBox>
      )}
    </>
  );
}
