import type { Space } from '@packmind/types';

interface CustomSpacesNavBlockProps {
  spaces: Space[];
  orgSlug: string;
  currentSpaceSlug: string | undefined;
  selectedSpaceId: string | null;
  onSpaceClick: (space: Space) => void;
}

export function CustomSpacesNavBlock(
  _props: Readonly<CustomSpacesNavBlockProps>,
): React.ReactElement {
  return <></>;
}
