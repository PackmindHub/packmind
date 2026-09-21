import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import { SpaceNavModeSection } from './SpaceNavModeSection';
import { SpaceNavModeProvider, useSpaceNavMode } from './SpaceNavModeContext';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { Analytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/analytics';

vi.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/amplitude/providers/analytics',
  () => ({
    Analytics: { track: vi.fn(), setUserProperties: vi.fn() },
  }),
);

/* Any account at all: both flags are open to everybody, so who is asking no
   longer changes either the offer or where they start. */
const SIGNED_IN = 'someone@example.com';
const CHOICE_KEY = 'space-nav-mode.v2';

function ModeProbe() {
  const { mode, shouldPointAtNewNavigation } = useSpaceNavMode();
  return (
    <>
      <span data-testid="mode">{mode}</span>
      <span data-testid="pointer">
        {shouldPointAtNewNavigation ? 'pointing' : 'quiet'}
      </span>
    </>
  );
}

/*
 * The email reaches the provider as well as the auth mock, the way the
 * protected layout passes it. Two flags read it, one for whether the section
 * shows and one for where the person starts, so a test that mocked only one of
 * the two would describe a state that cannot happen.
 */
/*
 * The provider without the section, which is the only way to read the pointer
 * before the offer has been on screen: rendering the section marks it seen on
 * mount, so a probe beside it would always report the state after the fact.
 */
function renderWithoutSection(userEmail: string, url = '/') {
  (useAuthContext as Mock).mockReturnValue({ user: { email: userEmail } });

  return render(
    <UIProvider>
      <MemoryRouter initialEntries={[url]}>
        <SpaceNavModeProvider userEmail={userEmail}>
          <ModeProbe />
        </SpaceNavModeProvider>
      </MemoryRouter>
    </UIProvider>,
  );
}

function renderSection(userEmail: string, url = '/') {
  (useAuthContext as Mock).mockReturnValue({ user: { email: userEmail } });

  return render(
    <UIProvider>
      <MemoryRouter initialEntries={[url]}>
        <SpaceNavModeProvider userEmail={userEmail}>
          <SpaceNavModeSection />
          <ModeProbe />
        </SpaceNavModeProvider>
      </MemoryRouter>
    </UIProvider>,
  );
}

describe('SpaceNavModeSection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  /*
   * The mark now has one audience left: somebody who chose the current
   * navigation back. Everybody else is already on the new one, which is what
   * the mark used to point at.
   */
  describe('the mark that points at it', () => {
    it('points, for somebody who switched back and has never had the offer on screen', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderWithoutSection(SIGNED_IN);

      expect(screen.getByTestId('pointer')).toHaveTextContent('pointing');
    });

    it('goes quiet once the section has rendered', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderSection(SIGNED_IN);

      expect(screen.getByTestId('pointer')).toHaveTextContent('quiet');
    });

    it('stays quiet on the next visit, since the browser remembers', () => {
      localStorage.setItem(CHOICE_KEY, 'today');
      renderSection(SIGNED_IN);
      cleanup();

      renderWithoutSection(SIGNED_IN);

      expect(screen.getByTestId('pointer')).toHaveTextContent('quiet');
    });

    describe('when the reader is already on the new navigation', () => {
      it('says nothing, since there is nothing to discover', () => {
        renderWithoutSection(SIGNED_IN);

        expect(screen.getByTestId('pointer')).toHaveTextContent('quiet');
      });
    });
  });

  describe('the switch', () => {
    it('names itself, since the profile page holds more than one section', () => {
      renderSection(SIGNED_IN);

      expect(
        screen.getByRole('heading', { name: 'Navigation (beta)' }),
      ).toBeInTheDocument();
    });

    it('is offered to every account', () => {
      renderSection(SIGNED_IN);

      expect(screen.getByLabelText('New navigation')).toBeInTheDocument();
    });

    it('says the choice is held by this browser', () => {
      renderSection(SIGNED_IN);

      expect(screen.getByText(/this browser/)).toBeInTheDocument();
    });

    it('starts on, since every account gets the new navigation by default', () => {
      renderSection(SIGNED_IN);

      expect(screen.getByLabelText('New navigation')).toBeChecked();
      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('flips the whole layout back to the current navigation', async () => {
      renderSection(SIGNED_IN);

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(screen.getByTestId('mode')).toHaveTextContent('today');
    });

    it('flips on again', async () => {
      renderSection(SIGNED_IN, '/?nav=today');

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('remembers the choice for the next visit', async () => {
      renderSection(SIGNED_IN);

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(localStorage.getItem(CHOICE_KEY)).toBe('today');
    });

    it('reads back a stored choice', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderSection(SIGNED_IN);

      expect(screen.getByLabelText('New navigation')).not.toBeChecked();
    });

    it('lets the URL win over what is stored', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderSection(SIGNED_IN, '/?nav=plugin-first');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('ignores a mode it does not know', () => {
      renderSection(SIGNED_IN, '/?nav=whatever');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    describe('when the first storage key holds a mode', () => {
      it('ignores it, since nobody chose it', () => {
        localStorage.setItem('space-nav-mode', 'today');

        renderSection(SIGNED_IN);

        expect(screen.getByLabelText('New navigation')).toBeChecked();
      });
    });
  });

  describe('what it reports', () => {
    it('names the architecture of every reader, so a rate has a denominator', () => {
      renderSection(SIGNED_IN);

      expect(Analytics.setUserProperties).toHaveBeenCalledWith({
        navigationMode: 'plugin-first',
      });
    });

    it('reports a flip of the switch', async () => {
      renderSection(SIGNED_IN);

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(Analytics.track).toHaveBeenCalledWith('navigation_mode_switched', {
        fromMode: 'plugin-first',
        toMode: 'today',
        origin: 'switch',
      });
    });

    it('reports a link that pins the other navigation', () => {
      renderSection(SIGNED_IN, '/?nav=today');

      expect(Analytics.track).toHaveBeenCalledWith('navigation_mode_switched', {
        fromMode: 'plugin-first',
        toMode: 'today',
        origin: 'link',
      });
    });

    describe('when the link asks for the mode the reader is already on', () => {
      it('reports nothing, since nothing moved', () => {
        renderSection(SIGNED_IN, '/?nav=plugin-first');

        expect(Analytics.track).not.toHaveBeenCalled();
      });
    });

    describe('when a mode was already chosen', () => {
      /* Reading the default instead of the chosen mode would report nothing
         here, since the link asks for what the default already is. */
      it('reports the move away from it, not from the default', () => {
        localStorage.setItem(CHOICE_KEY, 'today');

        renderSection(SIGNED_IN, '/?nav=plugin-first');

        expect(Analytics.track).toHaveBeenCalledWith(
          'navigation_mode_switched',
          { fromMode: 'today', toMode: 'plugin-first', origin: 'link' },
        );
      });
    });
  });
});
