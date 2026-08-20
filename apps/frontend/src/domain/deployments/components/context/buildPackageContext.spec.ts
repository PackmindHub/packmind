import {
  createCommandId,
  createSkillId,
  createStandardId,
  type Command,
  type Skill,
  type Standard,
} from '@packmind/types';
import {
  buildPackageContext,
  packageComponentCount,
  type PackageComponentIds,
  type PackageContext,
  type SpaceCatalogue,
} from './buildPackageContext';

const TARGET = { orgSlug: 'acme', spaceSlug: 'platform' };

const standard = (id: string, name: string, description = ''): Standard =>
  ({
    id: createStandardId(id),
    name,
    slug: name.toLowerCase(),
    description,
    version: 3,
  }) as Standard;

const command = (id: string, name: string): Command =>
  ({
    id: createCommandId(id),
    name,
    slug: name.toLowerCase(),
    content: 'body',
    version: 1,
  }) as Command;

const skill = (id: string, name: string, slug: string): Skill =>
  ({
    id: createSkillId(id),
    name,
    slug,
    description: `About ${name}`,
    version: 7,
  }) as Skill;

const catalogue = (
  overrides: Partial<SpaceCatalogue> = {},
): SpaceCatalogue => ({
  standards: [],
  commands: [],
  skills: [],
  ...overrides,
});

const pkg = (
  overrides: Partial<PackageComponentIds> = {},
): PackageComponentIds =>
  ({
    standards: [],
    commands: [],
    skills: [],
    ...overrides,
  }) as PackageComponentIds;

describe('buildPackageContext', () => {
  describe('when a package holds one component of each type', () => {
    let context: PackageContext;

    beforeEach(() => {
      context = buildPackageContext(
        pkg({
          standards: [createStandardId('s1')],
          commands: [createCommandId('c1')],
          skills: [createSkillId('k1')],
        }),
        catalogue({
          standards: [standard('s1', 'Naming')],
          commands: [command('c1', 'Release')],
          skills: [skill('k1', 'Refactor', 'refactor-safely')],
        }),
        TARGET,
      );
    });

    it('groups them in the order the navigation lists the types in', () => {
      expect(context.groups.map((group) => group.type)).toEqual([
        'standard',
        'command',
        'skill',
      ]);
    });

    it('names each group after its plural label', () => {
      expect(context.groups.map((group) => group.label)).toEqual([
        'Standards',
        'Commands',
        'Skills',
      ]);
    });

    it('counts every component in the total', () => {
      expect(context.total).toBe(3);
    });

    it('addresses a standard and a command by id, a skill by slug', () => {
      expect(
        context.groups.flatMap((group) => group.components).map((c) => c.href),
      ).toEqual([
        '/org/acme/space/platform/standards/s1',
        '/org/acme/space/platform/commands/c1',
        '/org/acme/space/platform/skills/refactor-safely',
      ]);
    });
  });

  it('leaves out the types the package carries none of', () => {
    const context = buildPackageContext(
      pkg({ skills: [createSkillId('k1')] }),
      catalogue({ skills: [skill('k1', 'Refactor', 'refactor')] }),
      TARGET,
    );

    expect(context.groups.map((group) => group.type)).toEqual(['skill']);
  });

  describe('when the package holds nothing', () => {
    let context: PackageContext;

    beforeEach(() => {
      context = buildPackageContext(pkg(), catalogue(), TARGET);
    });

    it('produces no group', () => {
      expect(context.groups).toEqual([]);
    });

    it('produces a total of zero', () => {
      expect(context.total).toBe(0);
    });
  });

  it('keeps only the components the package references', () => {
    const context = buildPackageContext(
      pkg({ standards: [createStandardId('s2')] }),
      catalogue({
        standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
      }),
      TARGET,
    );

    expect(context.groups[0].components.map((c) => c.name)).toEqual([
      'Testing',
    ]);
  });

  describe('when an id has no entity behind it', () => {
    let context: PackageContext;

    beforeEach(() => {
      context = buildPackageContext(
        pkg({ standards: [createStandardId('s1'), createStandardId('moved')] }),
        catalogue({ standards: [standard('s1', 'Naming')] }),
        TARGET,
      );
    });

    it('drops it from the rows', () => {
      expect(context.groups[0].components.map((c) => c.name)).toEqual([
        'Naming',
      ]);
    });

    it('drops it from the total too', () => {
      expect(context.total).toBe(1);
    });
  });

  it('sorts each group by name', () => {
    const context = buildPackageContext(
      pkg({
        standards: [
          createStandardId('s1'),
          createStandardId('s2'),
          createStandardId('s3'),
        ],
      }),
      catalogue({
        standards: [
          standard('s1', 'Zoning'),
          standard('s2', 'Auditing'),
          standard('s3', 'Naming'),
        ],
      }),
      TARGET,
    );

    expect(context.groups[0].components.map((c) => c.name)).toEqual([
      'Auditing',
      'Naming',
      'Zoning',
    ]);
  });

  describe('the row summary', () => {
    let context: PackageContext;

    beforeEach(() => {
      context = buildPackageContext(
        pkg({
          standards: [createStandardId('s1')],
          commands: [createCommandId('c1')],
        }),
        catalogue({
          standards: [standard('s1', 'Naming', 'How we name things')],
          commands: [command('c1', 'Release')],
        }),
        TARGET,
      );
    });

    it('repeats the description of a standard', () => {
      expect(context.groups[0].components[0].summary).toBe(
        'How we name things',
      );
    });

    it('is empty for a command, which has no description', () => {
      expect(context.groups[1].components[0].summary).toBe('');
    });
  });

  it('carries the version of each component', () => {
    const context = buildPackageContext(
      pkg({ skills: [createSkillId('k1')] }),
      catalogue({ skills: [skill('k1', 'Refactor', 'refactor')] }),
      TARGET,
    );

    expect(context.groups[0].components[0].version).toBe(7);
  });
});

describe('packageComponentCount', () => {
  it('adds up the three kinds without resolving any of them', () => {
    expect(
      packageComponentCount(
        pkg({
          standards: [createStandardId('s1'), createStandardId('s2')],
          commands: [createCommandId('c1')],
          skills: [createSkillId('k1')],
        }),
      ),
    ).toBe(4);
  });

  it('is zero for an empty package', () => {
    expect(packageComponentCount(pkg())).toBe(0);
  });
});
