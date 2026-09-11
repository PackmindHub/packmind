import type { ContextComponent, ContextGroup } from './buildPackageContext';
import { filterPackageGroups } from './filterPackageGroups';

const component = (
  name: string,
  { summary = '' }: { summary?: string } = {},
): ContextComponent => ({
  key: name,
  type: 'standard',
  name,
  summary,
  version: 1,
  href: `/${name}`,
  createdAt: null,
});

const groups: ContextGroup[] = [
  {
    type: 'standard',
    label: 'Standards',
    components: [
      component('Naming'),
      component('Testing', { summary: 'How we write specs' }),
    ],
  },
  {
    type: 'skill',
    label: 'Skills',
    components: [{ ...component('Onboarding'), type: 'skill' }],
  },
];

const noFilter = { query: '', type: null } as const;

describe('filterPackageGroups', () => {
  describe('when nothing is asked for', () => {
    it('gives back the groups as they are', () => {
      const result = filterPackageGroups(groups, noFilter);

      expect(result.groups.map((group) => group.type)).toEqual([
        'standard',
        'skill',
      ]);
      expect(result.shownCount).toBe(3);
      expect(result.totalCount).toBe(3);
    });
  });

  it('matches a name whatever the case', () => {
    const result = filterPackageGroups(groups, { query: 'nam', type: null });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].components.map((one) => one.name)).toEqual([
      'Naming',
    ]);
    expect(result.shownCount).toBe(1);
  });

  it('matches the summary too, which is where a component says what it is for', () => {
    const result = filterPackageGroups(groups, { query: 'specs', type: null });

    expect(result.groups[0].components.map((one) => one.name)).toEqual([
      'Testing',
    ]);
  });

  it('ignores the spaces around what is typed', () => {
    expect(
      filterPackageGroups(groups, { query: '  naming  ', type: null })
        .shownCount,
    ).toBe(1);
  });

  describe('when a type is picked', () => {
    it('keeps that group alone and leaves the others counted', () => {
      const result = filterPackageGroups(groups, {
        query: '',
        type: 'skill',
      });

      expect(result.groups.map((group) => group.type)).toEqual(['skill']);
      expect(result.shownCount).toBe(1);
      expect(result.totalCount).toBe(3);
    });
  });

  describe('when both are asked for', () => {
    it('narrows one with the other rather than replacing it', () => {
      expect(
        filterPackageGroups(groups, { query: 'naming', type: 'skill' }).groups,
      ).toEqual([]);
    });
  });

  it('carries what the group held before the query, for the "N of M" header', () => {
    const result = filterPackageGroups(groups, {
      query: 'testing',
      type: null,
    });

    expect(result.groups[0].total).toBe(2);
    expect(result.groups[0].components).toHaveLength(1);
  });

  describe('when a group has no match', () => {
    it('drops it rather than heading an empty run', () => {
      expect(
        filterPackageGroups(groups, { query: 'nothing', type: null }),
      ).toEqual({ groups: [], shownCount: 0, totalCount: 3 });
    });
  });
});
