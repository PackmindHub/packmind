import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import {
  resolveSpaceNavMode,
  SpaceNavModeProvider,
  useSpaceNavMode,
} from './SpaceNavModeContext';

const IN_BETA = 'someone@packmind.com';
const OUTSIDE_BETA = 'someone@example.com';
const CHOICE_KEY = 'space-nav-mode.v2';
const FIRST_KEY = 'space-nav-mode';

describe('resolveSpaceNavMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the current navigation', () => {
    expect(resolveSpaceNavMode('', OUTSIDE_BETA)).toBe('today');
  });

  it('answers for nobody in particular when given no email', () => {
    expect(resolveSpaceNavMode('')).toBe('today');
  });

  it('reads the mode that was chosen', () => {
    localStorage.setItem(CHOICE_KEY, 'plugin-first');

    expect(resolveSpaceNavMode('', OUTSIDE_BETA)).toBe('plugin-first');
  });

  it('lets an explicit nav win over the mode that was chosen', () => {
    localStorage.setItem(CHOICE_KEY, 'plugin-first');

    expect(resolveSpaceNavMode('?nav=today', OUTSIDE_BETA)).toBe('today');
  });

  it('pins a mode for someone who has never chosen one', () => {
    expect(resolveSpaceNavMode('?nav=plugin-first', OUTSIDE_BETA)).toBe(
      'plugin-first',
    );
  });

  it('ignores a mode it does not know', () => {
    expect(resolveSpaceNavMode('?nav=whatever', OUTSIDE_BETA)).toBe('today');
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(CHOICE_KEY, 'whatever');

    expect(resolveSpaceNavMode('', OUTSIDE_BETA)).toBe('today');
  });

  it('finds nav among other query parameters', () => {
    expect(
      resolveSpaceNavMode(
        '?stub=1&nav=plugin-first&view=repositories',
        OUTSIDE_BETA,
      ),
    ).toBe('plugin-first');
  });

  describe('when the flag covers the person', () => {
    it('defaults to the plugin-first navigation', () => {
      expect(resolveSpaceNavMode('', IN_BETA)).toBe('plugin-first');
    });

    it('covers every domain the flag lists', () => {
      expect(resolveSpaceNavMode('', 'someone@promyze.com')).toBe(
        'plugin-first',
      );
    });

    it('still lets a chosen mode win over the default', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      expect(resolveSpaceNavMode('', IN_BETA)).toBe('today');
    });
  });

  describe('when a mode sits under the first storage key', () => {
    it('ignores it, since it was written without anybody choosing', () => {
      localStorage.setItem(FIRST_KEY, 'today');

      expect(resolveSpaceNavMode('', IN_BETA)).toBe('plugin-first');
    });
  });
});

describe('SpaceNavModeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function mount(userEmail: string, entry = '/') {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[entry]}>
        <SpaceNavModeProvider userEmail={userEmail}>
          {children}
        </SpaceNavModeProvider>
      </MemoryRouter>
    );

    return renderHook(() => useSpaceNavMode(), { wrapper });
  }

  it('opens on the default for this person', () => {
    expect(mount(IN_BETA).result.current.mode).toBe('plugin-first');
  });

  it('stores nothing until a mode is chosen', () => {
    mount(IN_BETA);

    expect(localStorage.getItem(CHOICE_KEY)).toBeNull();
  });

  it('stores the mode that gets chosen', () => {
    const { result } = mount(IN_BETA);

    act(() => {
      result.current.setMode('today');
    });

    expect(result.current.mode).toBe('today');
    expect(localStorage.getItem(CHOICE_KEY)).toBe('today');
  });

  describe('when the URL pins a mode', () => {
    it('stores it, so an internal link does not undo it', () => {
      const { result } = mount(OUTSIDE_BETA, '/?nav=plugin-first');

      expect(result.current.mode).toBe('plugin-first');
      expect(localStorage.getItem(CHOICE_KEY)).toBe('plugin-first');
    });
  });
});
