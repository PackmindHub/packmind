import { Space } from '@packmind/types';

export function resolveSpaceFromArgs(
  spaceArg: string | undefined,
  spaces: Space[],
): Space | null {
  if (!spaceArg) return null;
  const slug = spaceArg.startsWith('@') ? spaceArg.slice(1) : spaceArg;
  return spaces.find((s) => s.slug === slug) ?? null;
}
