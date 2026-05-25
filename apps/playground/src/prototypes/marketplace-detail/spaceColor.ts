const SPACE_COLOR_PALETTES = [
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

export type SpaceColorPalette = (typeof SPACE_COLOR_PALETTES)[number];

export function getSpaceColorPalette(name: string): SpaceColorPalette {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = Math.trunc(hash * 31 + (name.codePointAt(i) ?? 0));
  }
  return SPACE_COLOR_PALETTES[Math.abs(hash) % SPACE_COLOR_PALETTES.length];
}
