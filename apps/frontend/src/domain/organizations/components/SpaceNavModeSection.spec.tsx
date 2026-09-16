import React from 'react';
import { render, screen } from '@testing-library/react';
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

const IN_BETA = 'joan@packmind.com';
const OUTSIDE_BETA = 'someone@example.com';
const CHOICE_KEY = 'space-nav-mode.v2';

function ModeProbe() {
  const { mode } = useSpaceNavMode();
  return <span data-testid="mode">{mode}</span>;
}

/*
 * The email reaches the provider as well as the auth mock, the way the
 * protected layout passes it: the flag decides both whether the section shows
 * and which navigation the person starts on, so a test that mocked only one of
 * the two would describe a state that cannot happen.
 */
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

  describe('when the user is outside the flag audience', () => {
    it('shows nothing', () => {
      renderSection(OUTSIDE_BETA);

      expect(screen.queryByLabelText('New navigation')).not.toBeInTheDocument();
    });

    it('leaves them on the current navigation', () => {
      renderSection(OUTSIDE_BETA);

      expect(screen.getByTestId('mode')).toHaveTextContent('today');
    });

    it('still honours a pinned demo link, so the mode is not gated', () => {
      renderSection(OUTSIDE_BETA, '/?nav=plugin-first');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });
  });

  describe('when the user is inside the flag audience', () => {
    it('names itself, since the profile page holds more than one section', () => {
      renderSection(IN_BETA);

      expect(
        screen.getByRole('heading', { name: 'Navigation' }),
      ).toBeInTheDocument();
    });

    it('says the choice is held by this browser', () => {
      renderSection(IN_BETA);

      expect(screen.getByText(/this browser/)).toBeInTheDocument();
    });

    it('starts on, since the audience gets the new navigation by default', () => {
      renderSection(IN_BETA);

      expect(screen.getByLabelText('New navigation')).toBeChecked();
      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('flips the whole layout back to the current navigation', async () => {
      renderSection(IN_BETA);

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(screen.getByTestId('mode')).toHaveTextContent('today');
    });

    it('flips on again', async () => {
      renderSection(IN_BETA, '/?nav=today');

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('remembers the choice for the next visit', async () => {
      renderSection(IN_BETA);

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(localStorage.getItem(CHOICE_KEY)).toBe('today');
    });

    it('reads back a stored choice', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderSection(IN_BETA);

      expect(screen.getByLabelText('New navigation')).not.toBeChecked();
    });

    it('lets the URL win over what is stored', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderSection(IN_BETA, '/?nav=plugin-first');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('ignores a mode it does not know', () => {
      renderSection(IN_BETA, '/?nav=whatever');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    describe('when the first storage key holds a mode', () => {
      it('ignores it, since nobody chose it', () => {
        localStorage.setItem('space-nav-mode', 'today');

        renderSection(IN_BETA);

        expect(screen.getByLabelText('New navigation')).toBeChecked();
      });
    });
  });
  describe('what it reports', () => {
    it('names the architecture of every reader, so a rate has a denominator', () => {
      renderSection(OUTSIDE_BETA);

      expect(Analytics.setUserProperties).toHaveBeenCalledWith({
        navigationMode: 'today',
      });
    });

    it('reports a flip of the switch', async () => {
      renderSection(IN_BETA);

      await userEvent.click(screen.getByLabelText('New navigation'));

      expect(Analytics.track).toHaveBeenCalledWith('navigation_mode_switched', {
        fromMode: 'plugin-first',
        toMode: 'today',
        origin: 'switch',
      });
    });

    it('reports an invitation link that was followed', () => {
      renderSection(OUTSIDE_BETA, '/?nav=plugin-first');

      expect(Analytics.track).toHaveBeenCalledWith('navigation_mode_switched', {
        fromMode: 'today',
        toMode: 'plugin-first',
        origin: 'link',
      });
    });

    describe('when the link asks for the mode the reader is already on', () => {
      it('reports nothing, since nothing moved', () => {
        renderSection(IN_BETA, '/?nav=plugin-first');

        expect(Analytics.track).not.toHaveBeenCalled();
      });
    });

    describe('when a mode was already chosen', () => {
      it('reports the move away from it, not from the default', () => {
        localStorage.setItem(CHOICE_KEY, 'plugin-first');

        renderSection(OUTSIDE_BETA, '/?nav=today');

        expect(Analytics.track).toHaveBeenCalledWith(
          'navigation_mode_switched',
          { fromMode: 'plugin-first', toMode: 'today', origin: 'link' },
        );
      });
    });
  });
});
