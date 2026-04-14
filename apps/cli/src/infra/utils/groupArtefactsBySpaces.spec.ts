import { spaceFactory } from '@packmind/spaces/test';
import { recipeFactory } from '@packmind/recipes/test';
import { groupArtefactBySpaces } from './groupArtefactsBySpaces';

describe('groupArtefactsBySpaces', () => {
  const spaceA = spaceFactory({ name: 'First' });
  const spaceB = spaceFactory({ name: 'Second' });

  const artefacts = [
    recipeFactory({ spaceId: spaceA.id, slug: 'command-a' }),
    recipeFactory({ spaceId: spaceB.id, slug: 'command-b' }),
    recipeFactory({ spaceId: spaceA.id, slug: 'command-c' }),
  ];

  it('groups the artefacts by spaces', () => {
    const groups = groupArtefactBySpaces(artefacts, [spaceA, spaceB]);

    expect(groups).toEqual([
      { space: spaceA, artefacts: [artefacts[0], artefacts[2]] },
      { space: spaceB, artefacts: [artefacts[1]] },
    ]);
  });

  it('excludes artefacts that do not belong to the provided spaces', () => {
    const groups = groupArtefactBySpaces(
      [...artefacts, recipeFactory(), recipeFactory()],
      [spaceA, spaceB],
    );

    expect(groups).toEqual([
      { space: spaceA, artefacts: [artefacts[0], artefacts[2]] },
      { space: spaceB, artefacts: [artefacts[1]] },
    ]);
  });

  it('sorts the spaces based on the name', () => {
    spaceA.name = 'ze last space';
    spaceB.name = 'First space';

    const groups = groupArtefactBySpaces(artefacts, [spaceA, spaceB]);

    expect(groups).toEqual([
      { space: spaceB, artefacts: [artefacts[1]] },
      { space: spaceA, artefacts: [artefacts[0], artefacts[2]] },
    ]);
  });

  it('sorts the artefacts based on the slug', () => {
    const space = spaceFactory();
    const artefacts = ['c', 'a', 'b'].map((slug) =>
      recipeFactory({ slug, spaceId: space.id }),
    );

    const groups = groupArtefactBySpaces(artefacts, [space]);

    expect(groups).toEqual([
      { space, artefacts: [artefacts[1], artefacts[2], artefacts[0]] },
    ]);
  });
});
