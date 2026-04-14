import { Space, SpaceId } from '@packmind/types';

export function groupArtefactBySpaces<
  T extends { spaceId: SpaceId; slug: string },
>(artefacts: T[], spaces: Space[]): Array<{ space: Space; artefacts: T[] }> {
  const spacesById = new Map<string, Space>(
    spaces.map((s) => [s.id as string, s]),
  );

  const groupedArtefacts = artefacts.reduce((acc, artefact) => {
    const space = spacesById.get(artefact.spaceId);
    if (space) {
      const group = acc.get(artefact.spaceId) ?? { space, artefacts: [] };

      acc.set(artefact.spaceId, {
        space,
        artefacts: [...group.artefacts, artefact],
      });
    }

    return acc;
  }, new Map<SpaceId, { space: Space; artefacts: T[] }>());

  return [...groupedArtefacts.values()]
    .map(({ space, artefacts }) => ({
      space,
      artefacts: [...artefacts].sort((a, b) => a.slug.localeCompare(b.slug)),
    }))
    .sort((a, b) => a.space.name.localeCompare(b.space.name));
}
