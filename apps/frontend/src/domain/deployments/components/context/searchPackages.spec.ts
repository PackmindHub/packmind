import {
  createCommandId,
  createPackageId,
  createSkillId,
  createStandardId,
  type Command,
  type PackageId,
  type PackageResponse,
  type Skill,
  type Standard,
} from '@packmind/types';
import type { SpaceCatalogue } from './buildPackageContext';
import { searchPackages, type PackageSearchResult } from './searchPackages';

const TARGET = { orgSlug: 'acme', spaceSlug: 'platform' };

const standard = (
  id: string,
  name: string,
  description = `About ${name}`,
): Standard =>
  ({
    id: createStandardId(id),
    name,
    slug: name.toLowerCase(),
    description,
    version: 2,
  }) as Standard;

const command = (id: string, name: string): Command =>
  ({
    id: createCommandId(id),
    name,
    slug: name.toLowerCase(),
    content: 'body',
    version: 1,
  }) as Command;

const skill = (id: string, name: string): Skill =>
  ({
    id: createSkillId(id),
    name,
    slug: name.toLowerCase(),
    description: `About ${name}`,
    version: 4,
  }) as Skill;

const catalogue = (
  overrides: Partial<SpaceCatalogue> = {},
): SpaceCatalogue => ({
  standards: [],
  commands: [],
  skills: [],
  ...overrides,
});

const pack = (
  id: string,
  name: string,
  holds: Partial<
    Pick<PackageResponse, 'standards' | 'commands' | 'skills' | 'description'>
  > = {},
): PackageResponse =>
  ({
    id: createPackageId(id),
    name,
    description: '',
    standards: [],
    commands: [],
    skills: [],
    ...holds,
  }) as PackageResponse;

const search = (
  packages: readonly PackageResponse[],
  query: string,
  options: Readonly<{
    catalogue?: SpaceCatalogue;
    selectedPackageId?: PackageId | null;
  }> = {},
): PackageSearchResult =>
  searchPackages(packages, options.catalogue ?? catalogue(), TARGET, {
    query,
    selectedPackageId: options.selectedPackageId ?? null,
  });

const BACKEND = pack('p1', 'Backend', {
  description: 'Everything the services share',
  standards: [createStandardId('s1')],
});
const FRONTEND = pack('p2', 'Frontend', {
  commands: [createCommandId('c1')],
  skills: [createSkillId('k1')],
});

const CATALOGUE = catalogue({
  standards: [standard('s1', 'Naming', 'How things are named')],
  commands: [command('c1', 'Release')],
  skills: [skill('k1', 'Refactor')],
});

describe('searchPackages', () => {
  describe('with nothing typed', () => {
    it('keeps every package, in the order it was given', () => {
      const result = search([BACKEND, FRONTEND], '   ');

      expect(result.rows.map((row) => row.pkg.name)).toEqual([
        'Backend',
        'Frontend',
      ]);
    });

    it('carries no component under any of them', () => {
      const result = search([BACKEND, FRONTEND], '', {
        catalogue: CATALOGUE,
      });

      expect(result.rows.every((row) => row.matches.length === 0)).toBe(true);
    });

    it('counts every package as a result', () => {
      const result = search([BACKEND, FRONTEND], '');

      expect(result.matchCount).toBe(2);
    });

    it('pins nothing, since the whole list is there', () => {
      const result = search([BACKEND, FRONTEND], '', {
        selectedPackageId: BACKEND.id,
      });

      expect(result.rows.some((row) => row.isPinned)).toBe(false);
    });
  });

  describe('matching a package', () => {
    it('keeps the one whose name carries the query', () => {
      const result = search([BACKEND, FRONTEND], 'front');

      expect(result.rows.map((row) => row.pkg.name)).toEqual(['Frontend']);
    });

    it('ignores case', () => {
      const result = search([BACKEND, FRONTEND], 'BACK');

      expect(result.rows.map((row) => row.pkg.name)).toEqual(['Backend']);
    });

    it('reads the description too', () => {
      const result = search([BACKEND, FRONTEND], 'services');

      expect(result.rows.map((row) => row.pkg.name)).toEqual(['Backend']);
    });

    describe('when its name alone carried the match', () => {
      it('leaves it without component rows', () => {
        const result = search([BACKEND, FRONTEND], 'back', {
          catalogue: CATALOGUE,
        });

        expect(result.rows[0].matches).toEqual([]);
      });
    });
  });

  describe('matching a component inside a package', () => {
    it('keeps the package that holds it', () => {
      const result = search([BACKEND, FRONTEND], 'refactor', {
        catalogue: CATALOGUE,
      });

      expect(result.rows.map((row) => row.pkg.name)).toEqual(['Frontend']);
    });

    it('says which component put it there', () => {
      const result = search([BACKEND, FRONTEND], 'refactor', {
        catalogue: CATALOGUE,
      });

      expect(result.rows[0].matches.map((match) => match.name)).toEqual([
        'Refactor',
      ]);
    });

    it('reads the summary of a component, not only its name', () => {
      const result = search([BACKEND, FRONTEND], 'how things', {
        catalogue: CATALOGUE,
      });

      expect(result.rows[0].matches.map((match) => match.name)).toEqual([
        'Naming',
      ]);
    });

    it('counts the package once, however many of its components matched', () => {
      const result = search(
        [
          pack('p3', 'Everything', {
            commands: [createCommandId('c1')],
            skills: [createSkillId('k1')],
          }),
        ],
        'e',
        { catalogue: CATALOGUE },
      );

      expect(result.matchCount).toBe(1);
    });

    it('lists a matching component under a package the query also named', () => {
      const result = search(
        [
          pack('p4', 'Naming', {
            standards: [createStandardId('s1')],
          }),
        ],
        'naming',
        { catalogue: CATALOGUE },
      );

      expect(result.rows[0].matches.map((match) => match.name)).toEqual([
        'Naming',
      ]);
    });
  });

  describe('when the query reaches nothing', () => {
    it('returns no row', () => {
      const result = search([BACKEND, FRONTEND], 'nothing here', {
        catalogue: CATALOGUE,
      });

      expect(result.rows).toEqual([]);
    });

    it('counts no result', () => {
      const result = search([BACKEND, FRONTEND], 'nothing here', {
        catalogue: CATALOGUE,
      });

      expect(result.matchCount).toBe(0);
    });
  });

  describe('when the open package is not one of the results', () => {
    const options = { catalogue: CATALOGUE, selectedPackageId: BACKEND.id };

    it('hoists it to the top of the rail anyway', () => {
      const result = search([BACKEND, FRONTEND], 'front', options);

      expect(result.rows.map((row) => row.pkg.name)).toEqual([
        'Backend',
        'Frontend',
      ]);
    });

    it('marks it as pinned rather than as a match', () => {
      const result = search([BACKEND, FRONTEND], 'front', options);

      expect(result.rows[0].isPinned).toBe(true);
    });

    it('leaves it out of the count of results', () => {
      const result = search([BACKEND, FRONTEND], 'front', options);

      expect(result.matchCount).toBe(1);
    });

    describe('when the query found nothing at all', () => {
      it('still counts no result', () => {
        const result = search([BACKEND, FRONTEND], 'nothing here', options);

        expect(result.matchCount).toBe(0);
      });

      it('shows the pin on its own', () => {
        const result = search([BACKEND, FRONTEND], 'nothing here', options);

        expect(result.rows.map((row) => row.pkg.name)).toEqual(['Backend']);
      });
    });
  });

  describe('when the open package is one of the results', () => {
    it('moves it to the top', () => {
      const result = search([BACKEND, FRONTEND], 'e', {
        catalogue: CATALOGUE,
        selectedPackageId: FRONTEND.id,
      });

      expect(result.rows.map((row) => row.pkg.name)).toEqual([
        'Frontend',
        'Backend',
      ]);
    });

    it('leaves it a match rather than a pin', () => {
      const result = search([BACKEND, FRONTEND], 'e', {
        catalogue: CATALOGUE,
        selectedPackageId: FRONTEND.id,
      });

      expect(result.rows[0].isPinned).toBe(false);
    });

    describe('when it is already the first of them', () => {
      it('leaves the list alone', () => {
        const result = search([BACKEND, FRONTEND], 'e', {
          catalogue: CATALOGUE,
          selectedPackageId: BACKEND.id,
        });

        expect(result.rows.map((row) => row.pkg.name)).toEqual([
          'Backend',
          'Frontend',
        ]);
      });
    });

    it('counts it once', () => {
      const result = search([BACKEND, FRONTEND], 'e', {
        catalogue: CATALOGUE,
        selectedPackageId: FRONTEND.id,
      });

      expect(result.matchCount).toBe(2);
    });
  });

  describe('when the selected id belongs to no package', () => {
    it('pins nothing, since a stale parameter is not a package', () => {
      const result = search([BACKEND, FRONTEND], 'front', {
        catalogue: CATALOGUE,
        selectedPackageId: createPackageId('gone'),
      });

      expect(result.rows.map((row) => row.pkg.name)).toEqual(['Frontend']);
    });
  });

  it('hands back the needle it searched with, folded and trimmed', () => {
    const result = search([BACKEND], '  BackEnd  ');

    expect(result.needle).toBe('backend');
  });
});
