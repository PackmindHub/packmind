import type { Space } from '@packmind/types';
import { SpaceNavBlock } from '../../organizations/components/sidebar/SpaceNavBlock';
import { PMSeparator } from '@packmind/ui';

interface CustomSpacesNavBlockProps {
  spaces: Space[];
  orgSlug: string;
  currentSpaceSlug: string | undefined;
  selectedSpaceId: string | null;
  onSpaceClick: (space: Space) => void;
}

export function CustomSpacesNavBlock({
  spaces,
  orgSlug,
  currentSpaceSlug,
  selectedSpaceId,
  onSpaceClick,
}: Readonly<CustomSpacesNavBlockProps>): React.ReactElement {
  return (
    <>
      {spaces
        .filter((space) => !space.isDefaultSpace)
        .map((space) => (
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
