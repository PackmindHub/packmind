import { resolveSpaceNavMode } from './SpaceNavModeContext';

describe('resolveSpaceNavMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the current navigation', () => {
    expect(resolveSpaceNavMode('')).toBe('today');
  });

  it('reads what was stored', () => {
    localStorage.setItem('space-nav-mode', 'plugin-first');

    expect(resolveSpaceNavMode('')).toBe('plugin-first');
  });

  it('lets an explicit nav win over what was stored', () => {
    localStorage.setItem('space-nav-mode', 'plugin-first');

    expect(resolveSpaceNavMode('?nav=today')).toBe('today');
  });

  it('pins a mode for someone who has never chosen one', () => {
    expect(resolveSpaceNavMode('?nav=plugin-first')).toBe('plugin-first');
  });

  it('ignores a mode it does not know', () => {
    expect(resolveSpaceNavMode('?nav=whatever')).toBe('today');
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem('space-nav-mode', 'whatever');

    expect(resolveSpaceNavMode('')).toBe('today');
  });

  it('finds nav among other query parameters', () => {
    expect(
      resolveSpaceNavMode('?stub=1&nav=plugin-first&view=repositories'),
    ).toBe('plugin-first');
  });
});
