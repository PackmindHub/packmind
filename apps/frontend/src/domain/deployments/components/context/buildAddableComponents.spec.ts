import {
  createCommandId,
  createPackageId,
  createSkillId,
  createStandardId,
  type Command,
  type PackageResponse,
  type Skill,
  type Standard,
} from '@packmind/types';
import {
  buildAddableComponents,
  countAddableComponents,
  filterAddableComponents,
  groupPickState,
  groupedComponentCount,
  withGroupPicked,
} from './buildAddableComponents';
import {
  componentSelectionKey,
  type PackageComponentIds,
  type SpaceCatalogue,
} from './buildPackageContext';
import {
  filterInventoryGroups,
  type InventoryGroup,
} from './buildSpaceInventory';

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
    // Absent from the declared type and present in the payload, see
    // `creationDateOf` in buildPackageContext.
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

const pack = (
  id: string,
  name: string,
  carries: Partial<
    Pick<PackageResponse, 'standards' | 'commands' | 'skills'>
  > = {},
): PackageResponse =>
  ({
    id: createPackageId(id),
    name,
    standards: [],
    commands: [],
    skills: [],
    ...carries,
  }) as PackageResponse;

/** No other package in the space, so every candidate is in none. */
const ALONE: readonly PackageResponse[] = [];

const namesOf = (groups: readonly InventoryGroup[]) =>
  groups.map((group) => [
    group.type,
    group.entries.map((entry) => entry.component.name),
  ]);

const ownersOf = (groups: readonly InventoryGroup[]) =>
  groups.flatMap((group) =>
    group.entries.map(
      (entry) =>
        [entry.component.name, entry.packageNames] as [string, string[]],
    ),
  );

describe('buildAddableComponents', () => {
  it('offers a component the package does not hold', () => {
    const result = buildAddableComponents(
      holds(),
      ALONE,
      catalogue({ standards: [standard('s1', 'Naming')] }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['standard', ['Naming']]]);
  });

  it('leaves out a component the package already holds', () => {
    const result = buildAddableComponents(
      holds({ standards: [createStandardId('s1')] }),
      ALONE,
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
      ALONE,
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
      ALONE,
      catalogue({ skills: [skill('k1', 'Onboard'), skill('k2', 'Migrate')] }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['skill', ['Migrate']]]);
  });

  it('does not confuse two types that share an id', () => {
    const result = buildAddableComponents(
      holds({ standards: [createStandardId('shared')] }),
      ALONE,
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
      ALONE,
      catalogue({ standards: [standard('s1', 'Naming')] }),
      TARGET,
    );

    expect(namesOf(result.groups)).toEqual([['standard', ['Naming']]]);
  });

  describe('when a type has nothing left to add', () => {
    it('drops its group rather than showing it empty', () => {
      const result = buildAddableComponents(
        holds({ standards: [createStandardId('s1')] }),
        ALONE,
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
        ALONE,
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
      ALONE,
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

    buildAddableComponents(holds(), ALONE, catalogue({ standards }), TARGET);

    expect(standards.map((entity) => entity.name)).toEqual([
      'Testing',
      'Naming',
    ]);
  });

  it('builds the same row the pane renders', () => {
    const result = buildAddableComponents(
      holds(),
      ALONE,
      catalogue({
        standards: [standard('s1', 'Naming', 'How things are named')],
      }),
      TARGET,
    );

    expect(result.groups[0].entries[0].component).toEqual({
      key: createStandardId('s1'),
      type: 'standard',
      name: 'Naming',
      summary: 'How things are named',
      version: 3,
      href: '/org/acme/space/platform/standards/s1',
      createdAt: null,
    });
  });

  describe('what already carries a candidate', () => {
    const packages = [
      pack('p1', 'Backend', { standards: [createStandardId('s1')] }),
      pack('p2', 'Frontend', { standards: [createStandardId('s1')] }),
      pack('p3', 'Mobile', { commands: [createCommandId('c1')] }),
    ];
    const space = catalogue({
      standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
      commands: [command('c1', 'Release')],
    });

    const result = () =>
      buildAddableComponents(holds(), packages, space, TARGET);

    it('names every package holding it, sorted', () => {
      expect(ownersOf(result().groups)).toEqual([
        ['Naming', ['Backend', 'Frontend']],
        ['Testing', []],
        ['Release', ['Mobile']],
      ]);
    });

    it('leaves a candidate no package carries with none', () => {
      const testing = result().groups[0].entries.find(
        (entry) => entry.component.name === 'Testing',
      );

      expect(testing?.packageNames).toEqual([]);
    });

    /*
     * The package being filled is not in the list it was built from, so its own
     * name could never appear here. Pinned because the candidates are exactly
     * the components it does not hold: a candidate labelled with the package
     * that is about to receive it would be a contradiction on the row.
     */
    it('never names the package being filled', () => {
      const filling = pack('p4', 'Platform', {
        standards: [createStandardId('s2')],
      });

      const owners = ownersOf(
        buildAddableComponents(
          holds({ standards: [createStandardId('s2')] }),
          [...packages, filling],
          space,
          TARGET,
        ).groups,
      );

      expect(owners.flatMap(([, names]) => names)).not.toContain('Platform');
    });
  });

  describe('counts', () => {
    it('totals what is addable across the groups', () => {
      const result = buildAddableComponents(
        holds({ standards: [createStandardId('s1')] }),
        ALONE,
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
        ALONE,
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
          commands: [command('c1', 'Release')],
        }),
        TARGET,
      );

      expect(result.catalogueTotal).toBe(3);
    });

    describe('freeTotal', () => {
      const space = catalogue({
        standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
        commands: [command('c1', 'Release')],
      });

      it('counts only the candidates no package carries', () => {
        const result = buildAddableComponents(
          holds(),
          [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
          space,
          TARGET,
        );

        expect(result.freeTotal).toBe(2);
      });

      describe('when no package carries anything', () => {
        it('equals the total', () => {
          const result = buildAddableComponents(holds(), ALONE, space, TARGET);

          expect(result.freeTotal).toBe(result.total);
        });
      });

      describe('when every candidate already ships somewhere', () => {
        it('counts none, while the candidates remain', () => {
          const result = buildAddableComponents(
            holds(),
            [
              pack('p1', 'Backend', {
                standards: [createStandardId('s1'), createStandardId('s2')],
                commands: [createCommandId('c1')],
              }),
            ],
            space,
            TARGET,
          );

          expect(result).toMatchObject({ total: 3, freeTotal: 0 });
        });
      });
    });

    describe('when the package already holds everything', () => {
      const result = () =>
        buildAddableComponents(
          holds({ standards: [createStandardId('s1')] }),
          ALONE,
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
        expect(
          buildAddableComponents(holds(), ALONE, catalogue(), TARGET),
        ).toEqual({
          groups: [],
          total: 0,
          freeTotal: 0,
          catalogueTotal: 0,
        });
      });
    });
  });
});

/*
 * The coverage filter the picker opens on is the inventory's own, applied to
 * these groups. Pinned here rather than only beside the inventory, because it
 * is what the drawer's default shows: the two surfaces have to agree on which
 * components count as unplaced, and on the order they are read in.
 */
describe('filtering the candidates to those in no package', () => {
  const groups = () =>
    buildAddableComponents(
      holds(),
      [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
      catalogue({
        standards: [
          standard('s1', 'Naming', '', '2026-01-01T00:00:00.000Z'),
          standard('s2', 'Testing', '', '2026-02-01T00:00:00.000Z'),
          standard('s3', 'Reviewing', '', '2026-03-01T00:00:00.000Z'),
        ],
      }),
      TARGET,
    ).groups;

  it('drops the candidates a package already carries', () => {
    expect(namesOf(filterInventoryGroups(groups(), 'none'))).toEqual([
      ['standard', ['Reviewing', 'Testing']],
    ]);
  });

  describe('when the filter is off', () => {
    it('keeps every candidate', () => {
      expect(namesOf(filterInventoryGroups(groups(), 'all'))).toEqual([
        ['standard', ['Naming', 'Reviewing', 'Testing']],
      ]);
    });
  });
});

describe('groupedComponentCount', () => {
  it('sums the components of every group', () => {
    const { groups } = buildAddableComponents(
      holds(),
      ALONE,
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
      [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
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

  it('does not match on the package already carrying a component', () => {
    expect(filterAddableComponents(groups(), 'Backend')).toEqual([]);
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

describe('countAddableComponents', () => {
  it('counts what the catalogue holds across the three types', () => {
    expect(
      countAddableComponents(
        holds(),
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
          commands: [command('c1', 'Release')],
          skills: [skill('k1', 'Review')],
        }),
      ),
    ).toBe(4);
  });

  it('leaves out what the package already holds', () => {
    expect(
      countAddableComponents(
        holds({ standards: [createStandardId('s1')] }),
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
        }),
      ),
    ).toBe(1);
  });

  describe('when the package references an artefact the space no longer owns', () => {
    it('does not count it, the way subtracting the two totals would', () => {
      expect(
        countAddableComponents(
          holds({
            standards: [createStandardId('s1'), createStandardId('gone')],
          }),
          catalogue({
            standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
          }),
        ),
      ).toBe(1);
    });
  });

  describe('when the space owns nothing', () => {
    it('counts nothing', () => {
      expect(countAddableComponents(holds(), catalogue())).toBe(0);
    });
  });

  describe('when the package holds everything the space owns', () => {
    it('counts nothing', () => {
      expect(
        countAddableComponents(
          holds({
            standards: [createStandardId('s1')],
            commands: [createCommandId('c1')],
            skills: [createSkillId('k1')],
          }),
          catalogue({
            standards: [standard('s1', 'Naming')],
            commands: [command('c1', 'Release')],
            skills: [skill('k1', 'Review')],
          }),
        ),
      ).toBe(0);
    });
  });

  /*
   * The reason the header is allowed to ask the cheap question: the two answers
   * are the same answer, so the control's shape and the list it opens cannot
   * disagree about whether there is anything to pick.
   */
  it('agrees with the total the picker itself reports', () => {
    const pkg = holds({
      standards: [createStandardId('s1')],
      skills: [createSkillId('k1')],
    });
    const space = catalogue({
      standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
      commands: [command('c1', 'Release')],
      skills: [skill('k1', 'Review'), skill('k2', 'Refactor')],
    });

    expect(countAddableComponents(pkg, space)).toBe(
      buildAddableComponents(pkg, ALONE, space, TARGET).total,
    );
  });
});

describe('the heading of a group', () => {
  const skillGroup = (): InventoryGroup => {
    const { groups } = buildAddableComponents(
      holds(),
      ALONE,
      catalogue({
        skills: [
          skill('k1', 'Onboard'),
          skill('k2', 'Release'),
          skill('k3', 'Triage'),
        ],
      }),
      TARGET,
    );
    return groups[0];
  };

  const keysOf = (group: InventoryGroup, names: readonly string[]) =>
    new Set(
      group.entries
        .filter(({ component }) => names.includes(component.name))
        .map(({ component }) => componentSelectionKey(component)),
    );

  describe('groupPickState', () => {
    it('reads nothing picked as none', () => {
      expect(groupPickState(new Set(), skillGroup())).toBe('none');
    });

    it('reads part of it as some', () => {
      const group = skillGroup();

      expect(groupPickState(keysOf(group, ['Release']), group)).toBe('some');
    });

    it('reads the whole of it as all', () => {
      const group = skillGroup();

      expect(
        groupPickState(keysOf(group, ['Onboard', 'Release', 'Triage']), group),
      ).toBe('all');
    });

    it('reads a group with no entry as none', () => {
      const group = { ...skillGroup(), entries: [] };

      expect(groupPickState(new Set(), group)).toBe('none');
    });
  });

  describe('withGroupPicked', () => {
    it('picks every entry of the group', () => {
      const group = skillGroup();

      expect(withGroupPicked(new Set(), group, true).size).toBe(3);
    });

    it('drops every entry of the group', () => {
      const group = skillGroup();
      const all = keysOf(group, ['Onboard', 'Release', 'Triage']);

      expect(withGroupPicked(all, group, false).size).toBe(0);
    });

    it('leaves a pick made outside the group alone', () => {
      const group = skillGroup();
      const elsewhere = new Set(['standard:s9']);

      expect([...withGroupPicked(elsewhere, group, true)]).toContain(
        'standard:s9',
      );
    });

    describe('when clearing', () => {
      it('keeps a pick made outside the group', () => {
        const group = skillGroup();
        const mixed = new Set([
          'standard:s9',
          ...keysOf(group, ['Onboard', 'Release', 'Triage']),
        ]);

        expect([...withGroupPicked(mixed, group, false)]).toEqual([
          'standard:s9',
        ]);
      });
    });

    it('does not change the set it was handed', () => {
      const group = skillGroup();
      const before = new Set<string>();
      withGroupPicked(before, group, true);

      expect(before.size).toBe(0);
    });
  });
});
