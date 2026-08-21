import {
  createCommandId,
  createPackageId,
  createSkillId,
  createStandardId,
  type PackageResponse,
} from '@packmind/types';
import type { ContextComponent } from './buildPackageContext';
import {
  buildMoveTargets,
  componentIdsPayload,
  filterMoveTargets,
  packageHoldsComponent,
  type MoveTarget,
} from './buildMoveTargets';

const pack = (
  id: string,
  name: string,
  holds: Partial<
    Pick<PackageResponse, 'standards' | 'commands' | 'skills'>
  > = {},
  description = '',
): PackageResponse =>
  ({
    id: createPackageId(id),
    name,
    description,
    standards: [],
    commands: [],
    skills: [],
    ...holds,
  }) as PackageResponse;

const component = (
  type: ContextComponent['type'],
  key: string,
): Pick<ContextComponent, 'type' | 'key'> => ({ type, key });

const SOURCE = createPackageId('source');

describe('componentIdsPayload', () => {
  it('addresses a standard by its standard id', () => {
    expect(componentIdsPayload(component('standard', 's1'))).toEqual({
      standardIds: [createStandardId('s1')],
    });
  });

  it('addresses a command by its command id', () => {
    expect(componentIdsPayload(component('command', 'c1'))).toEqual({
      commandIds: [createCommandId('c1')],
    });
  });

  it('addresses a skill by its skill id', () => {
    expect(componentIdsPayload(component('skill', 'k1'))).toEqual({
      skillIds: [createSkillId('k1')],
    });
  });

  it('leaves the types it is not about out of the payload', () => {
    expect(Object.keys(componentIdsPayload(component('skill', 'k1')))).toEqual([
      'skillIds',
    ]);
  });
});

describe('packageHoldsComponent', () => {
  describe('when the package carries the component', () => {
    it('says so for a standard', () => {
      const pkg = pack('p1', 'Backend', {
        standards: [createStandardId('s1')],
      });

      expect(packageHoldsComponent(pkg, component('standard', 's1'))).toBe(
        true,
      );
    });

    it('says so for a command', () => {
      const pkg = pack('p1', 'Backend', {
        commands: [createCommandId('c1')],
      });

      expect(packageHoldsComponent(pkg, component('command', 'c1'))).toBe(true);
    });

    it('says so for a skill', () => {
      const pkg = pack('p1', 'Backend', { skills: [createSkillId('k1')] });

      expect(packageHoldsComponent(pkg, component('skill', 'k1'))).toBe(true);
    });
  });

  it('does not confuse two types that share an id', () => {
    const pkg = pack('p1', 'Backend', { standards: [createStandardId('x')] });

    expect(packageHoldsComponent(pkg, component('skill', 'x'))).toBe(false);
  });

  it('reads a package that carries nothing of that type', () => {
    const pkg = pack('p1', 'Backend');

    expect(packageHoldsComponent(pkg, component('command', 'c1'))).toBe(false);
  });

  it('survives a package whose arrays are absent', () => {
    const pkg = { name: 'Legacy' } as PackageResponse;

    expect(packageHoldsComponent(pkg, component('standard', 's1'))).toBe(false);
  });
});

describe('buildMoveTargets', () => {
  describe('when the space holds several packages', () => {
    let targets: MoveTarget[];

    beforeEach(() => {
      targets = buildMoveTargets(
        [
          pack('zulu', 'Zulu'),
          { ...pack('source', 'Source'), id: SOURCE },
          pack('alpha', 'Alpha', { standards: [createStandardId('s1')] }),
        ],
        component('standard', 's1'),
        SOURCE,
      );
    });

    it('leaves out the package the component is read from', () => {
      expect(targets.map((target) => target.pkg.name)).toEqual([
        'Alpha',
        'Zulu',
      ]);
    });

    it('marks the one that already carries the component', () => {
      expect(
        targets.find((target) => target.pkg.name === 'Alpha')?.alreadyHolds,
      ).toBe(true);
    });

    it('leaves the others open to a real move', () => {
      expect(
        targets.find((target) => target.pkg.name === 'Zulu')?.alreadyHolds,
      ).toBe(false);
    });
  });

  it('sorts by name rather than by the order the space returned', () => {
    const targets = buildMoveTargets(
      [pack('p1', 'Rendering'), pack('p2', 'Backend'), pack('p3', 'API')],
      component('skill', 'k1'),
      SOURCE,
    );

    expect(targets.map((target) => target.pkg.name)).toEqual([
      'API',
      'Backend',
      'Rendering',
    ]);
  });

  describe('when the source is the only package of the space', () => {
    it('offers nowhere to go', () => {
      const targets = buildMoveTargets(
        [{ ...pack('source', 'Source'), id: SOURCE }],
        component('command', 'c1'),
        SOURCE,
      );

      expect(targets).toEqual([]);
    });
  });
});

describe('filterMoveTargets', () => {
  const targets = buildMoveTargets(
    [
      pack('p1', 'Backend rules', {}, 'How the API is written'),
      pack('p2', 'Frontend rules', {}, 'How the app is written'),
      pack('p3', 'Docs', {}, 'Everything about the product'),
    ],
    component('standard', 's1'),
    SOURCE,
  );

  describe('when nothing is typed', () => {
    it('keeps every candidate', () => {
      expect(filterMoveTargets(targets, '  ')).toHaveLength(3);
    });
  });

  it('keeps the candidates whose name matches', () => {
    expect(filterMoveTargets(targets, 'front').map((t) => t.pkg.name)).toEqual([
      'Frontend rules',
    ]);
  });

  it('keeps a candidate matched by its description alone', () => {
    expect(
      filterMoveTargets(targets, 'product').map((t) => t.pkg.name),
    ).toEqual(['Docs']);
  });

  it('ignores the case of what was typed', () => {
    expect(filterMoveTargets(targets, 'DOCS')).toHaveLength(1);
  });

  describe('when nothing matches', () => {
    it('returns an empty list rather than everything', () => {
      expect(filterMoveTargets(targets, 'kubernetes')).toEqual([]);
    });
  });
});
