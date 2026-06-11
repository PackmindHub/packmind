export const SPACE_COLOR_PALETTES = [
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

export type SpaceColor = (typeof SPACE_COLOR_PALETTES)[number];

export function isSpaceColor(value: unknown): value is SpaceColor {
  return (
    typeof value === 'string' &&
    (SPACE_COLOR_PALETTES as readonly string[]).includes(value)
  );
}
