import type { Space } from '@packmind/types';
import { SpaceNavBlock } from '../../organizations/components/sidebar/SpaceNavBlock';
import { PMSeparator } from '@packmind/ui';

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
      <PMSeparator borderColor="border.secondary" my={2} />
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
