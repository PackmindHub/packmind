import { SPACE_COLOR_PALETTE, getColorTokenForSpace } from './spaceColor';

const DETERMINISTIC_IDS = [
  'a',
  'aa',
  'space-1',
  'SPACE-1',
  '00000000-0000-0000-0000-000000000000',
  'd9b1c2-aaaa-bbbb',
  'b1d4f7e2-3a8c-4f7d-9e2a-1c5b6d8e9f0a',
  'global',
  'frontend',
  'design-system',
  'platform',
  'mobile',
];

describe('getColorTokenForSpace', () => {
  it('returns the same color for the same id across calls', () => {
    const space = { id: 'abc-123-def', isDefaultSpace: false };
    const first = getColorTokenForSpace(space);
    const second = getColorTokenForSpace(space);
    const third = getColorTokenForSpace(space);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('always returns a token from the palette for a deterministic set of ids', () => {
    for (const id of DETERMINISTIC_IDS) {
      const result = getColorTokenForSpace({ id, isDefaultSpace: false });
      expect(SPACE_COLOR_PALETTE).toContain(result);
    }
  });

  it('returns a palette token for an empty id when not the default space', () => {
    const result = getColorTokenForSpace({ id: '', isDefaultSpace: false });
    expect(SPACE_COLOR_PALETTE).toContain(result);
  });

  it('returns a palette token for very long ids', () => {
    const result = getColorTokenForSpace({
      id: 'x'.repeat(2048),
      isDefaultSpace: false,
    });
    expect(SPACE_COLOR_PALETTE).toContain(result);
  });

  it('produces more than one distinct color across distinct ids', () => {
    const colors = new Set(
      DETERMINISTIC_IDS.map((id) =>
        getColorTokenForSpace({ id, isDefaultSpace: false }),
      ),
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  it('always returns blue when the space is the default space', () => {
    const ids = ['anything', 'whatever-id', 'd9b1c2-aaaa-bbbb', ''];
    for (const id of ids) {
      const result = getColorTokenForSpace({ id, isDefaultSpace: true });
      expect(result).toBe('blue');
    }
  });

  it('exposes a palette aligned with the space identity section', () => {
    expect(SPACE_COLOR_PALETTE).toEqual([
      'red',
      'orange',
      'yellow',
      'green',
      'teal',
      'blue',
      'cyan',
      'purple',
      'pink',
    ]);
  });
});
