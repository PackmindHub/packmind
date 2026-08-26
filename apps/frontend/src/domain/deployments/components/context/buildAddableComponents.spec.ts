import {
  createCommandId,
  createSkillId,
  createStandardId,
  type Command,
  type Skill,
  type Standard,
} from '@packmind/types';
import {
  buildAddableComponents,
  filterAddableComponents,
  groupedComponentCount,
} from './buildAddableComponents';
import type {
  ContextGroup,
  PackageComponentIds,
  SpaceCatalogue,
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

const skill = (id: string, name: string, description = ''): Skill =>
  ({
    id: createSkillId(id),
    name,
    slug: name.toLowerCase(),
    description,
    version: 7,
  }) as Skill;

const catalogue = (parts: Partial<SpaceCatalogue> = {}): SpaceCatalogue => ({
  standards: [],
  commands: [],
  skills: [],
  ...parts,
});

const holds = (parts: Partial<PackageComponentIds> = {}): PackageComponentIds =>
  ({
    standards: [],
    commands: [],
    skills: [],
    ...parts,
  }) as PackageComponentIds;

const namesOf = (groups: readonly ContextGroup[]) =>
  groups.map((group) => [
    group.type,
    group.components.map((component) => component.name),
  ]);

describe('buildAddableComponents', () => {
  it('offers a component the package does not hold', () => {
    const result = buildAddableComponents(
      holds(),
      catalogue({ standards: [standard('s1', 'Naming')] }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['standard', ['Naming']]]);
  });

  it('leaves out a component the package already holds', () => {
    const result = buildAddableComponents(
      holds({ standards: [createStandardId('s1')] }),
      catalogue({
        standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
      }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['standard', ['Testing']]]);
  });

  it('leaves out a command the package already holds', () => {
    const result = buildAddableComponents(
      holds({ commands: [createCommandId('c1')] }),
      catalogue({
        commands: [command('c1', 'Release'), command('c2', 'Review')],
      }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['command', ['Review']]]);
  });

  it('leaves out a skill the package already holds', () => {
    const result = buildAddableComponents(
      holds({ skills: [createSkillId('k1')] }),
      catalogue({ skills: [skill('k1', 'Onboard'), skill('k2', 'Migrate')] }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['skill', ['Migrate']]]);
  });

  it('does not confuse two types that share an id', () => {
    const result = buildAddableComponents(
      holds({ standards: [createStandardId('shared')] }),
      catalogue({
        standards: [standard('shared', 'Naming')],
        commands: [command('shared', 'Release')],
      }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['command', ['Release']]]);
  });

  it('survives a package whose membership arrays are absent', () => {
    const result = buildAddableComponents(
      {} as PackageComponentIds,
      catalogue({ standards: [standard('s1', 'Naming')] }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['standard', ['Naming']]]);
  });

  describe('when a type has nothing left to add', () => {
    it('drops its group rather than showing it empty', () => {
      const result = buildAddableComponents(
        holds({ standards: [createStandardId('s1')] }),
        catalogue({
          standards: [standard('s1', 'Naming')],
          commands: [command('c1', 'Release')],
        }),
        TARGET,
      );

      expect(result.groups.map((group) => group.type)).toEqual(['command']);
    });
  });

  describe('when several types have something to add', () => {
    const result = () =>
      buildAddableComponents(
        holds(),
        catalogue({
          skills: [skill('k1', 'Onboard')],
          commands: [command('c1', 'Release')],
          standards: [standard('s1', 'Naming')],
        }),
        TARGET,
      );

    it('groups them in the order the pane lists them', () => {
      expect(result().groups.map((group) => group.type)).toEqual([
        'standard',
        'command',
        'skill',
      ]);
    });

    it('heads each group with the plural label of its type', () => {
      expect(result().groups.map((group) => group.label)).toEqual([
        'Standards',
        'Commands',
        'Skills',
      ]);
    });
  });

  it('orders a group alphabetically rather than by catalogue order', () => {
    const result = buildAddableComponents(
      holds(),
      catalogue({
        standards: [
          standard('s1', 'Testing'),
          standard('s2', 'Naming'),
          standard('s3', 'Reviewing'),
        ],
      }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([
      ['standard', ['Naming', 'Reviewing', 'Testing']],
    ]);
  });

  it('does not reorder the catalogue it was handed', () => {
    const standards = [standard('s1', 'Testing'), standard('s2', 'Naming')];

    buildAddableComponents(holds(), catalogue({ standards }), TARGET);

    expect(standards.map((entity) => entity.name)).toEqual([
      'Testing',
      'Naming',
    ]);
  });

  it('builds the same row the pane renders', () => {
    const result = buildAddableComponents(
      holds(),
      catalogue({
        standards: [standard('s1', 'Naming', 'How things are named')],
      }),
      TARGET,
    );

    expect(result.groups[0].components[0]).toEqual({
      key: createStandardId('s1'),
      type: 'standard',
      name: 'Naming',
      summary: 'How things are named',
      version: 3,
      href: '/org/acme/space/platform/standards/s1',
      createdAt: null,
    });
  });

  describe('counts', () => {
    it('totals what is addable across the groups', () => {
      const result = buildAddableComponents(
        holds({ standards: [createStandardId('s1')] }),
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
          commands: [command('c1', 'Release')],
        }),
        TARGET,
      );

      expect(result.total).toBe(2);
    });

    it('counts the whole space apart from what is addable', () => {
      const result = buildAddableComponents(
        holds({ standards: [createStandardId('s1')] }),
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
          commands: [command('c1', 'Release')],
        }),
        TARGET,
      );

      expect(result.catalogueTotal).toBe(3);
    });

    describe('when the package already holds everything', () => {
      const result = () =>
        buildAddableComponents(
          holds({ standards: [createStandardId('s1')] }),
          catalogue({ standards: [standard('s1', 'Naming')] }),
          TARGET,
        );

      it('has nothing to offer', () => {
        expect(result().total).toBe(0);
      });

      /* The two zeroes the empty picker has to tell apart. */
      it('still says the space owns something', () => {
        expect(result().catalogueTotal).toBe(1);
      });
    });

    describe('when the space owns nothing', () => {
      it('has nothing to offer and nothing to count', () => {
        expect(buildAddableComponents(holds(), catalogue(), TARGET)).toEqual({
          groups: [],
          total: 0,
          catalogueTotal: 0,
        });
      });
    });
  });
});

describe('groupedComponentCount', () => {
  it('sums the components of every group', () => {
    const { groups } = buildAddableComponents(
      holds(),
      catalogue({
        standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
        skills: [skill('k1', 'Onboard')],
      }),
      TARGET,
    );

    expect(groupedComponentCount(groups)).toBe(3);
  });

  it('counts no group as nothing', () => {
    expect(groupedComponentCount([])).toBe(0);
  });
});

describe('filterAddableComponents', () => {
  const groups = () =>
    buildAddableComponents(
      holds(),
      catalogue({
        standards: [
          standard('s1', 'Naming', 'How things are named'),
          standard('s2', 'Testing', 'How things are proven'),
        ],
        commands: [command('c1', 'Release')],
      }),
      TARGET,
    ).groups;

  it('keeps the components whose name matches', () => {
    expect(namesOf(filterAddableComponents(groups(), 'Nam'))).toEqual([
      ['standard', ['Naming']],
    ]);
  });

  it('ignores the case of the query', () => {
    expect(namesOf(filterAddableComponents(groups(), 'nAMing'))).toEqual([
      ['standard', ['Naming']],
    ]);
  });

  it('keeps the components whose description matches', () => {
    expect(namesOf(filterAddableComponents(groups(), 'proven'))).toEqual([
      ['standard', ['Testing']],
    ]);
  });

  it('drops a group the query emptied', () => {
    expect(
      filterAddableComponents(groups(), 'Release').map((group) => group.type),
    ).toEqual(['command']);
  });

  describe('when the query matches nothing', () => {
    it('keeps nothing', () => {
      expect(filterAddableComponents(groups(), 'nowhere')).toEqual([]);
    });
  });

  describe('when the query is blank', () => {
    it('keeps everything', () => {
      expect(namesOf(filterAddableComponents(groups(), '   '))).toEqual(
        namesOf(groups()),
      );
    });
  });

  it('leaves the groups it was handed alone', () => {
    const original = groups();

    filterAddableComponents(original, 'Naming');

    expect(namesOf(original)).toEqual([
      ['standard', ['Naming', 'Testing']],
      ['command', ['Release']],
    ]);
  });
});
