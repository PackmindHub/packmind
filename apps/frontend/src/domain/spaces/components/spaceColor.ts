export const SPACE_COLOR_PALETTE = [
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

export type SpaceColorToken = (typeof SPACE_COLOR_PALETTE)[number];

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
