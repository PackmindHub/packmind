import { Space } from '@packmind/types';

export function resolveSpace(spaces: Space[], slug?: string): Space {
  const normalizedSlug = slug?.replace(/^@/, '');

  if (normalizedSlug) {
    const found = spaces.find((s) => s.slug === normalizedSlug);
    if (!found) {
      const spaceList = spaces
        .map((s) => `  - ${s.slug}  (${s.name})`)
        .join('\n');
      throw new Error(
        `Space "${normalizedSlug}" not found. Available spaces:\n${spaceList}`,
      );
    }
    return found;
  }

  if (spaces.length > 1) {
    const spaceList = spaces
      .map((s) => `  - ${s.slug}  (${s.name})`)
      .join('\n');
    throw new Error(
      `Multiple spaces found. Please specify one using --space:\n${spaceList}`,
    );
  }

  return spaces[0];
}
