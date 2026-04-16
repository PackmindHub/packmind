import type { UserSpaceWithRole } from '@packmind/types';
import { PMBox, PMText } from '@packmind/ui';
import { SpaceNavBlock } from '../../organizations/components/sidebar/SpaceNavBlock';
import { sortSpacesByName } from '../utils/sortSpacesByName';

const MAX_UNPINNED_SIDEBAR_SPACES = 3;

interface CustomSpacesNavBlockProps {
  spaces: UserSpaceWithRole[];
  orgSlug: string;
  currentSpaceSlug: string | undefined;
  selectedSpaceId: string | null;
  onSpaceClick: (space: UserSpaceWithRole) => void;
}

export function CustomSpacesNavBlock({
  spaces,
  orgSlug,
  currentSpaceSlug,
  selectedSpaceId,
  onSpaceClick,
}: Readonly<CustomSpacesNavBlockProps>): React.ReactElement {
  const customSpaces = spaces.filter((space) => !space.isDefaultSpace);
  const pinnedSpaces = sortSpacesByName(
    customSpaces.filter((space) => space.pinned),
  );
  const unpinnedSpaces = sortSpacesByName(
    customSpaces.filter((space) => !space.pinned),
  ).slice(0, MAX_UNPINNED_SIDEBAR_SPACES);

  return (
    <>
      {pinnedSpaces.length > 0 && (
        <>
          <PMBox px={3} pt={3} pb={1}>
            <PMText fontSize="2xs" fontWeight="semibold" color="text.faded">
              Pinned
            </PMText>
          </PMBox>
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
      <PMBox px={3} pt={3} pb={1}>
        <PMText fontSize="2xs" fontWeight="semibold" color="text.faded">
          My spaces
        </PMText>
      </PMBox>
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
    </>
  );
}
