import type { Space } from '@packmind/types';
import { SpaceNavBlock } from '../../organizations/components/sidebar/SpaceNavBlock';

interface CustomSpacesNavBlockProps {
  spaces: Space[];
  orgSlug: string;
  currentSpaceSlug: string | undefined;
  onSpaceClick: (space: Space) => void;
}

export function CustomSpacesNavBlock({
  spaces,
  orgSlug,
  currentSpaceSlug,
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
            onSpaceClick={() => onSpaceClick(space)}
          />
        ))}
    </>
  );
}
