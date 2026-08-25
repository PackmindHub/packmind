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
import type { SpaceCatalogue } from './buildPackageContext';
import {
  buildSpaceInventory,
  filterInventoryGroups,
  type InventoryGroup,
  type SpaceInventory,
} from './buildSpaceInventory';

const TARGET = { orgSlug: 'acme', spaceSlug: 'platform' };

const standard = (id: string, name: string, createdAt?: string): Standard =>
  ({
    id: createStandardId(id),
    name,
    slug: name.toLowerCase(),
    description: `About ${name}`,
    version: 2,
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
    Pick<PackageResponse, 'standards' | 'commands' | 'skills'>
  > = {},
): PackageResponse =>
  ({
    id: createPackageId(id),
    name,
    standards: [],
    commands: [],
    skills: [],
    ...holds,
  }) as PackageResponse;

describe('buildSpaceInventory', () => {
  describe('when the space owns one component of each type', () => {
    let inventory: SpaceInventory;

    beforeEach(() => {
      inventory = buildSpaceInventory(
        [
          pack('p1', 'Backend', {
            standards: [createStandardId('s1')],
            commands: [createCommandId('c1')],
            skills: [createSkillId('k1')],
          }),
        ],
        catalogue({
          standards: [standard('s1', 'Naming')],
          commands: [command('c1', 'Release')],
          skills: [skill('k1', 'Refactor')],
        }),
        TARGET,
      );
    });

    it('groups them in the order the navigation lists the types in', () => {
      expect(inventory.groups.map((group) => group.type)).toEqual([
        'standard',
        'command',
        'skill',
      ]);
    });

    it('counts them all', () => {
      expect(inventory.total).toBe(3);
    });

    it('counts them per type', () => {
      expect(inventory.countsByType).toEqual({
        standard: 1,
        command: 1,
        skill: 1,
      });
    });

    it('names the package that carries each of them', () => {
      expect(
        inventory.groups.flatMap((group) =>
          group.entries.map((entry) => entry.packageNames),
        ),
      ).toEqual([['Backend'], ['Backend'], ['Backend']]);
    });
  });

  describe('when a component is in no package', () => {
    let inventory: SpaceInventory;

    beforeEach(() => {
      inventory = buildSpaceInventory(
        [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
        }),
        TARGET,
      );
    });

    it('still lists it', () => {
      expect(
        inventory.groups[0].entries.map((entry) => entry.component.name),
      ).toEqual(['Naming', 'Testing']);
    });

    it('leaves its package list empty', () => {
      expect(inventory.groups[0].entries[1].packageNames).toEqual([]);
    });

    it('counts it as an orphan', () => {
      expect(inventory.orphanCount).toBe(1);
    });
  });

  it('reports no orphan for a fully carried space', () => {
    const inventory = buildSpaceInventory(
      [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
      catalogue({ standards: [standard('s1', 'Naming')] }),
      TARGET,
    );

    expect(inventory.orphanCount).toBe(0);
  });

  describe('when two packages carry the same component', () => {
    let inventory: SpaceInventory;

    beforeEach(() => {
      inventory = buildSpaceInventory(
        [
          pack('p2', 'Frontend', { standards: [createStandardId('s1')] }),
          pack('p1', 'Backend', { standards: [createStandardId('s1')] }),
        ],
        catalogue({ standards: [standard('s1', 'Naming')] }),
        TARGET,
      );
    });

    it('lists the component once', () => {
      expect(inventory.total).toBe(1);
    });

    it('names both packages, sorted', () => {
      expect(inventory.groups[0].entries[0].packageNames).toEqual([
        'Backend',
        'Frontend',
      ]);
    });
  });

  it('sorts each group by component name', () => {
    const inventory = buildSpaceInventory(
      [],
      catalogue({
        standards: [
          standard('s1', 'Zoning'),
          standard('s2', 'Auditing'),
          standard('s3', 'Naming'),
        ],
      }),
      TARGET,
    );

    expect(
      inventory.groups[0].entries.map((entry) => entry.component.name),
    ).toEqual(['Auditing', 'Naming', 'Zoning']);
  });

  it('leaves out the types the space owns none of', () => {
    const inventory = buildSpaceInventory(
      [],
      catalogue({ skills: [skill('k1', 'Refactor')] }),
      TARGET,
    );

    expect(inventory.groups.map((group) => group.type)).toEqual(['skill']);
  });

  describe('when the space owns nothing', () => {
    let inventory: SpaceInventory;

    beforeEach(() => {
      inventory = buildSpaceInventory([], catalogue(), TARGET);
    });

    it('produces no group', () => {
      expect(inventory.groups).toEqual([]);
    });

    it('produces a total of zero', () => {
      expect(inventory.total).toBe(0);
    });
  });

  it('ignores a package referencing a component the space no longer owns', () => {
    const inventory = buildSpaceInventory(
      [pack('p1', 'Backend', { standards: [createStandardId('moved')] })],
      catalogue({ standards: [standard('s1', 'Naming')] }),
      TARGET,
    );

    expect(inventory.total).toBe(1);
  });

  it('carries the row built for the component, addresses included', () => {
    const inventory = buildSpaceInventory(
      [],
      catalogue({ skills: [skill('k1', 'Refactor')] }),
      TARGET,
    );

    expect(inventory.groups[0].entries[0].component.href).toBe(
      '/org/acme/space/platform/skills/refactor',
    );
  });
});

describe('filterInventoryGroups', () => {
  const inventoryOf = (packages: PackageResponse[], cat: SpaceCatalogue) =>
    buildSpaceInventory(packages, cat, TARGET);

  describe('when the filter is off', () => {
    it('returns every group', () => {
      const inventory = inventoryOf(
        [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
        }),
      );

      expect(
        filterInventoryGroups(inventory.groups, 'all')[0].entries,
      ).toHaveLength(2);
    });
  });

  describe('when only the components in no package are wanted', () => {
    let groups: InventoryGroup[];

    beforeEach(() => {
      const inventory = inventoryOf(
        [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
        catalogue({
          standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
          skills: [skill('k1', 'Refactor')],
        }),
      );
      groups = filterInventoryGroups(inventory.groups, 'none');
    });

    it('keeps the ones no package carries', () => {
      expect(
        groups.flatMap((group) =>
          group.entries.map((entry) => entry.component.name),
        ),
      ).toEqual(['Testing', 'Refactor']);
    });

    it('leaves out the ones a package carries', () => {
      expect(
        groups.flatMap((group) =>
          group.entries.map((entry) => entry.component.name),
        ),
      ).not.toContain('Naming');
    });
  });

  it('drops a type that has no component in no package', () => {
    const inventory = inventoryOf(
      [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
      catalogue({
        standards: [standard('s1', 'Naming')],
        skills: [skill('k1', 'Refactor')],
      }),
    );

    expect(filterInventoryGroups(inventory.groups, 'none')).toHaveLength(1);
  });

  it('orders them newest first rather than by name', () => {
    const inventory = inventoryOf(
      [],
      catalogue({
        standards: [
          standard('s1', 'Auditing', '2026-01-01T00:00:00.000Z'),
          standard('s2', 'Naming', '2026-03-01T00:00:00.000Z'),
          standard('s3', 'Zoning', '2026-02-01T00:00:00.000Z'),
        ],
      }),
    );

    expect(
      filterInventoryGroups(inventory.groups, 'none')[0].entries.map(
        (entry) => entry.component.name,
      ),
    ).toEqual(['Naming', 'Zoning', 'Auditing']);
  });

  it('sinks the ones with no date to the bottom', () => {
    const inventory = inventoryOf(
      [],
      catalogue({
        standards: [
          standard('s1', 'Auditing'),
          standard('s2', 'Naming', '2026-01-01T00:00:00.000Z'),
        ],
      }),
    );

    expect(
      filterInventoryGroups(inventory.groups, 'none')[0].entries.map(
        (entry) => entry.component.name,
      ),
    ).toEqual(['Naming', 'Auditing']);
  });

  it('falls back to the name for two components created at the same moment', () => {
    const inventory = inventoryOf(
      [],
      catalogue({
        standards: [
          standard('s1', 'Zoning', '2026-01-01T00:00:00.000Z'),
          standard('s2', 'Auditing', '2026-01-01T00:00:00.000Z'),
        ],
      }),
    );

    expect(
      filterInventoryGroups(inventory.groups, 'none')[0].entries.map(
        (entry) => entry.component.name,
      ),
    ).toEqual(['Auditing', 'Zoning']);
  });

  it('leaves the counts of the space alone', () => {
    const inventory = inventoryOf(
      [pack('p1', 'Backend', { standards: [createStandardId('s1')] })],
      catalogue({
        standards: [standard('s1', 'Naming'), standard('s2', 'Testing')],
      }),
    );

    filterInventoryGroups(inventory.groups, 'none');

    expect(inventory.total).toBe(2);
  });
});
