import type { SpaceColorToken } from './types';

export const SPACE_COLOR_PALETTE: readonly SpaceColorToken[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'cyan',
  'purple',
  'pink',
] as const;

const DEFAULT_SPACE_COLOR: SpaceColorToken = 'blue';

export function getColorTokenForSpace(space: {
  id: string;
  isDefaultSpace: boolean;
}): SpaceColorToken {
  if (space.isDefaultSpace) {
    return DEFAULT_SPACE_COLOR;
  }

  let hash = 0;
  for (let i = 0; i < space.id.length; i++) {
    hash = (hash * 31 + space.id.charCodeAt(i)) | 0;
  }

  return SPACE_COLOR_PALETTE[Math.abs(hash) % SPACE_COLOR_PALETTE.length];
}
