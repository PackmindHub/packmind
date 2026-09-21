import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import {
  resolveSpaceNavMode,
  SpaceNavModeProvider,
  useSpaceNavMode,
  withNavMode,
} from './SpaceNavModeContext';

/* Any account at all: the default no longer depends on who is asking, only on
   somebody being signed in. */
const SIGNED_IN = 'someone@example.com';
const CHOICE_KEY = 'space-nav-mode.v2';
const FIRST_KEY = 'space-nav-mode';

describe('resolveSpaceNavMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the new navigation', () => {
    expect(resolveSpaceNavMode('', SIGNED_IN)).toBe('plugin-first');
  });

  it('answers the same whatever the account', () => {
    expect(resolveSpaceNavMode('', 'someone@packmind.com')).toBe(
      'plugin-first',
    );
  });

  it('answers for nobody in particular when given no email', () => {
    expect(resolveSpaceNavMode('')).toBe('today');
  });

  it('reads the mode that was chosen', () => {
    localStorage.setItem(CHOICE_KEY, 'today');

    expect(resolveSpaceNavMode('', SIGNED_IN)).toBe('today');
  });

  it('lets an explicit nav win over the mode that was chosen', () => {
    localStorage.setItem(CHOICE_KEY, 'today');

    expect(resolveSpaceNavMode('?nav=plugin-first', SIGNED_IN)).toBe(
      'plugin-first',
    );
  });

  it('pins a mode for someone who has never chosen one', () => {
    expect(resolveSpaceNavMode('?nav=today', SIGNED_IN)).toBe('today');
  });

  it('ignores a mode it does not know', () => {
    expect(resolveSpaceNavMode('?nav=whatever', SIGNED_IN)).toBe(
      'plugin-first',
    );
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(CHOICE_KEY, 'whatever');

    expect(resolveSpaceNavMode('', SIGNED_IN)).toBe('plugin-first');
  });

  it('finds nav among other query parameters', () => {
    expect(
      resolveSpaceNavMode('?stub=1&nav=today&view=repositories', SIGNED_IN),
    ).toBe('today');
  });

  describe('when a mode sits under the first storage key', () => {
    it('ignores it, since it was written without anybody choosing', () => {
      localStorage.setItem(FIRST_KEY, 'today');

      expect(resolveSpaceNavMode('', SIGNED_IN)).toBe('plugin-first');
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
    expect(mount(SIGNED_IN).result.current.mode).toBe('plugin-first');
  });

  it('stores nothing until a mode is chosen', () => {
    mount(SIGNED_IN);

    expect(localStorage.getItem(CHOICE_KEY)).toBeNull();
  });

  it('stores the mode that gets chosen', () => {
    const { result } = mount(SIGNED_IN);

    act(() => {
      result.current.setMode('today');
    });

    expect(result.current.mode).toBe('today');
    expect(localStorage.getItem(CHOICE_KEY)).toBe('today');
  });

  describe('when the URL pins a mode', () => {
    it('stores it, so an internal link does not undo it', () => {
      /* Pinned to the mode that is *not* the default, so the assertion says
         the parameter was read rather than that nothing happened. */
      const { result } = mount(SIGNED_IN, '/?nav=today');

      expect(result.current.mode).toBe('today');
      expect(localStorage.getItem(CHOICE_KEY)).toBe('today');
    });
  });
});

describe('withNavMode', () => {
  it('leaves an address alone when nothing was pinned', () => {
    expect(withNavMode('/org/acme/space/core/context', '')).toBe(
      '/org/acme/space/core/context',
    );
  });

  describe('when a mode was pinned', () => {
    it('carries it onto an address with no query of its own', () => {
      expect(
        withNavMode('/org/acme/space/core/context', '?nav=plugin-first'),
      ).toBe('/org/acme/space/core/context?nav=plugin-first');
    });

    it('carries it onto an address that already has one', () => {
      expect(
        withNavMode(
          '/org/acme/space/core/context?component=standard-1',
          '?nav=plugin-first&tab=distribution',
        ),
      ).toBe(
        '/org/acme/space/core/context?component=standard-1&nav=plugin-first',
      );
    });
  });
});
