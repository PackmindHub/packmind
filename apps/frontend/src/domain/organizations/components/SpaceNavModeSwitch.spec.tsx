import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import { SpaceNavModeSwitch } from './SpaceNavModeSwitch';
import { SpaceNavModeProvider, useSpaceNavMode } from './SpaceNavModeContext';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

vi.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

const IN_BETA = 'joan@packmind.com';
const OUTSIDE_BETA = 'someone@example.com';
const CHOICE_KEY = 'space-nav-mode.v2';

function ModeProbe() {
  const { mode } = useSpaceNavMode();
  return <span data-testid="mode">{mode}</span>;
}

/*
 * The email reaches the provider as well as the auth mock, the way the
 * protected layout passes it: the flag decides both whether the switch shows
 * and which navigation the person starts on, so a test that mocked only one of
 * the two would describe a state that cannot happen.
 */
function renderSwitch(userEmail: string, url = '/') {
  (useAuthContext as Mock).mockReturnValue({ user: { email: userEmail } });

  return render(
    <UIProvider>
      <MemoryRouter initialEntries={[url]}>
        <SpaceNavModeProvider userEmail={userEmail}>
          <SpaceNavModeSwitch />
          <ModeProbe />
        </SpaceNavModeProvider>
      </MemoryRouter>
    </UIProvider>,
  );
}

describe('SpaceNavModeSwitch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('when the user is outside the flag audience', () => {
    it('shows nothing', () => {
      renderSwitch(OUTSIDE_BETA);

      expect(
        screen.queryByLabelText('Use the new navigation'),
      ).not.toBeInTheDocument();
    });

    it('leaves them on the current navigation', () => {
      renderSwitch(OUTSIDE_BETA);

      expect(screen.getByTestId('mode')).toHaveTextContent('today');
    });

    it('still honours a pinned demo link, so the mode is not gated', () => {
      renderSwitch(OUTSIDE_BETA, '/?nav=plugin-first');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });
  });

  describe('when the user is inside the flag audience', () => {
    it('starts on, since the audience gets the new navigation by default', () => {
      renderSwitch(IN_BETA);

      expect(screen.getByLabelText('Use the new navigation')).toBeChecked();
      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('flips the whole layout back to the current navigation', async () => {
      renderSwitch(IN_BETA);

      await userEvent.click(screen.getByLabelText('Use the new navigation'));

      expect(screen.getByTestId('mode')).toHaveTextContent('today');
    });

    it('flips on again', async () => {
      renderSwitch(IN_BETA, '/?nav=today');

      await userEvent.click(screen.getByLabelText('Use the new navigation'));

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('remembers the choice for the next visit', async () => {
      renderSwitch(IN_BETA);

      await userEvent.click(screen.getByLabelText('Use the new navigation'));

      expect(localStorage.getItem(CHOICE_KEY)).toBe('today');
    });

    it('reads back a stored choice', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderSwitch(IN_BETA);

      expect(screen.getByLabelText('Use the new navigation')).not.toBeChecked();
    });

    it('lets the URL win over what is stored', () => {
      localStorage.setItem(CHOICE_KEY, 'today');

      renderSwitch(IN_BETA, '/?nav=plugin-first');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    it('ignores a mode it does not know', () => {
      renderSwitch(IN_BETA, '/?nav=whatever');

      expect(screen.getByTestId('mode')).toHaveTextContent('plugin-first');
    });

    describe('when the first storage key holds a mode', () => {
      it('ignores it, since nobody chose it', () => {
        localStorage.setItem('space-nav-mode', 'today');

        renderSwitch(IN_BETA);

        expect(screen.getByLabelText('Use the new navigation')).toBeChecked();
      });
    });
  });
});
