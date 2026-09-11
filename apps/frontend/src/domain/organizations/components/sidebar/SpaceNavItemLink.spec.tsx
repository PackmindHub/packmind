import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { SpaceNavItemLink } from './SpaceNavItemLink';

const CONTEXT_URL = '/org/acme/space/backend/context';

function renderAt(address: string, alsoOwns?: string[]) {
  render(
    <UIProvider>
      <MemoryRouter initialEntries={[address]}>
        <SpaceNavItemLink
          url={CONTEXT_URL}
          label="Context"
          alsoOwns={alsoOwns}
        />
      </MemoryRouter>
    </UIProvider>,
  );
}

/**
 * Whether the entry reads as the one the reader is on. The state is a colour
 * and a weight, which no assertion can name, so it is read from the marker
 * both sidebar links set for exactly that.
 */
function litEntry() {
  return screen.getByRole('link').querySelector('[data-active="true"]');
}

describe('SpaceNavItemLink', () => {
  it('is lit on its own address', () => {
    renderAt(CONTEXT_URL);

    expect(litEntry()).not.toBeNull();
  });

  it('stays unlit on an address belonging to another entry', () => {
    renderAt('/org/acme/space/backend/distribution');

    expect(litEntry()).toBeNull();
  });

  describe('when the entry stands for other addresses too', () => {
    const alsoOwns = ['/org/acme/space/backend/standards'];

    /*
     * A reader who opened a standard's rules out of the Context pane. The page
     * is not under Context's url, and until this the sidebar went dark and read
     * as having left the navigation.
     */
    it('stays lit under one of them', () => {
      renderAt(
        '/org/acme/space/backend/standards/standard-1/summary',
        alsoOwns,
      );

      expect(litEntry()).not.toBeNull();
    });

    it('is still unlit everywhere else', () => {
      renderAt('/org/acme/space/backend/review-changes', alsoOwns);

      expect(litEntry()).toBeNull();
    });
  });
});
