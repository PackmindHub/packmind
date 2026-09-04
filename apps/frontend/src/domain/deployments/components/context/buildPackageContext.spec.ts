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
  componentSelectionKey,
  componentSetKind,
  componentSetSubject,
  packageComponentCount,
  type PackageComponentIds,
  type PackageContext,
  type SpaceCatalogue,
} from './buildPackageContext';

const TARGET = { orgSlug: 'acme', spaceSlug: 'platform' };

const standard = (
  id: string,
  name: string,
  description = '',
  createdAt?: string,
): Standard =>
  ({
    id: createStandardId(id),
    name,
    slug: name.toLowerCase(),
    description,
    version: 3,
    // Absent from the declared type and present in the payload, which is the
    // whole reason the mapper reads it through a cast.
    ...(createdAt ? { createdAt } : {}),
  }) as Standard;

const command = (id: string, name: string): Command =>
  ({
    id: createCommandId(id),
    name,
    slug: name.toLowerCase(),
    content: 'body',
    version: 1,
  }) as Command;

const skill = (
  id: string,
  name: string,
  slug: string,
  createdAt?: Date,
): Skill =>
  ({
    id: createSkillId(id),
    name,
    slug,
    description: `About ${name}`,
    version: 7,
    ...(createdAt ? { createdAt } : {}),
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

    it('reads the summary of a command out of its file', () => {
      expect(context.groups[1].components[0].summary).toBe('body');
    });
  });

  describe('when a command declares a description in its frontmatter', () => {
    it('uses it as the row summary', () => {
      const context = buildPackageContext(
        pkg({ commands: [createCommandId('c1')] }),
        catalogue({
          commands: [
            {
              ...command('c1', 'Release'),
              content: '---\ndescription: Cut a release\n---\n\n# Release',
            },
          ],
        }),
        TARGET,
      );

      expect(context.groups[0].components[0].summary).toBe('Cut a release');
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

describe('the creation date of a row', () => {
  it('carries the date the payload sent', () => {
    const context = buildPackageContext(
      pkg({ standards: [createStandardId('s1')] }),
      catalogue({
        standards: [standard('s1', 'Naming', '', '2026-03-04T10:00:00.000Z')],
      }),
      TARGET,
    );

    expect(context.groups[0].components[0].createdAt).toBe(
      '2026-03-04T10:00:00.000Z',
    );
  });

  it('normalises a Date to the string the other two arrive as', () => {
    const context = buildPackageContext(
      pkg({ skills: [createSkillId('k1')] }),
      catalogue({
        skills: [
          skill(
            'k1',
            'Refactor',
            'refactor',
            new Date('2026-03-04T10:00:00.000Z'),
          ),
        ],
      }),
      TARGET,
    );

    expect(context.groups[0].components[0].createdAt).toBe(
      '2026-03-04T10:00:00.000Z',
    );
  });

  describe('when the entity carries none', () => {
    it('is null', () => {
      const context = buildPackageContext(
        pkg({ commands: [createCommandId('c1')] }),
        catalogue({ commands: [command('c1', 'Release')] }),
        TARGET,
      );

      expect(context.groups[0].components[0].createdAt).toBeNull();
    });
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

describe('componentSelectionKey', () => {
  it('tells two types that share an id apart', () => {
    expect(componentSelectionKey({ type: 'standard', key: 'x' })).not.toEqual(
      componentSelectionKey({ type: 'skill', key: 'x' }),
    );
  });

  it('gives the same component the same key twice', () => {
    expect(componentSelectionKey({ type: 'command', key: 'c1' })).toEqual(
      componentSelectionKey({ type: 'command', key: 'c1' }),
    );
  });
});

describe('componentSetKind', () => {
  it('names one component by the singular of its type', () => {
    expect(componentSetKind([{ type: 'standard' }])).toBe('standard');
  });

  describe('when several components share one type', () => {
    it('names them by the plural of that type', () => {
      expect(componentSetKind([{ type: 'skill' }, { type: 'skill' }])).toBe(
        'skills',
      );
    });
  });

  describe('when the components are of several types', () => {
    it('names them without naming any of the types', () => {
      expect(
        componentSetKind([{ type: 'standard' }, { type: 'command' }]),
      ).toBe('components');
    });
  });

  it('reads the whole set rather than its first member', () => {
    expect(
      componentSetKind([
        { type: 'command' },
        { type: 'command' },
        { type: 'skill' },
      ]),
    ).toBe('components');
  });
});

describe('componentSetSubject', () => {
  it('names one component rather than counting it', () => {
    expect(componentSetSubject([{ type: 'standard', name: 'Naming' }])).toBe(
      'Naming',
    );
  });

  it('counts several of one type under that type', () => {
    expect(
      componentSetSubject([
        { type: 'command', name: 'Release' },
        { type: 'command', name: 'Review' },
      ]),
    ).toBe('2 commands');
  });

  describe('when the components are of several types', () => {
    it('counts them without naming a type', () => {
      expect(
        componentSetSubject([
          { type: 'standard', name: 'Naming' },
          { type: 'skill', name: 'Onboard' },
        ]),
      ).toBe('2 components');
    });
  });
});
