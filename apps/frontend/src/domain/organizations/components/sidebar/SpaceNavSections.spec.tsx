import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { SpaceNavSections } from './SpaceNavSections';
import {
  SpaceNavModeProvider,
  type SpaceNavMode,
} from '../SpaceNavModeContext';

const ORG_SLUG = 'acme';
const SPACE_SLUG = 'platform';

/*
 * The mode is pinned through the store the provider reads rather than through
 * the flag audience, and the email is deliberately outside that audience: a
 * spec that named an in-audience address would answer "plugin-first" for the
 * `today` cases too the day the audience changes.
 */
const OUTSIDE_BETA = 'someone@example.com';
const CHOICE_KEY = 'space-nav-mode.v2';

function renderIn(mode: SpaceNavMode) {
  localStorage.setItem(CHOICE_KEY, mode);

  return render(
    <UIProvider>
      <MemoryRouter>
        <SpaceNavModeProvider userEmail={OUTSIDE_BETA}>
          <SpaceNavSections orgSlug={ORG_SLUG} spaceSlug={SPACE_SLUG} />
        </SpaceNavModeProvider>
      </MemoryRouter>
    </UIProvider>,
  );
}

describe('SpaceNavSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('in the current navigation', () => {
    it('lists Overview', () => {
      renderIn('today');

      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('lists the playbook entries', () => {
      renderIn('today');

      expect(screen.getByText('Standards')).toBeInTheDocument();
    });

    it('lists Packages', () => {
      renderIn('today');

      expect(screen.getByText('Packages')).toBeInTheDocument();
    });

    it('does not list Context', () => {
      renderIn('today');

      expect(screen.queryByText('Context')).not.toBeInTheDocument();
    });
  });

  describe('in the plugin-first navigation', () => {
    it('lists Context', () => {
      renderIn('plugin-first');

      expect(screen.getByText('Context')).toBeInTheDocument();
    });

    it('points Context at the space context surface', () => {
      renderIn('plugin-first');

      expect(screen.getByRole('link', { name: 'Context' })).toHaveAttribute(
        'href',
        `/org/${ORG_SLUG}/space/${SPACE_SLUG}/context`,
      );
    });

    it('lists Distribution', () => {
      renderIn('plugin-first');

      expect(screen.getByText('Distribution')).toBeInTheDocument();
    });

    it('points Distribution at the space distribution surface', () => {
      renderIn('plugin-first');

      expect(
        screen.getByRole('link', { name: 'Distribution' }),
      ).toHaveAttribute(
        'href',
        `/org/${ORG_SLUG}/space/${SPACE_SLUG}/distribution`,
      );
    });

    it('drops the entry the space index redirects away from', () => {
      renderIn('plugin-first');

      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });

    it('drops the entries named after a component type', () => {
      renderIn('plugin-first');

      expect(screen.queryByText('Standards')).not.toBeInTheDocument();
    });

    it('does not offer Review changes, which this edition has no surface for', () => {
      renderIn('plugin-first');

      expect(screen.queryByText('Review changes')).not.toBeInTheDocument();
    });
  });
});
