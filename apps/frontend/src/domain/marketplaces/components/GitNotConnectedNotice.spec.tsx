import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { GitNotConnectedNotice } from './GitNotConnectedNotice';

describe('GitNotConnectedNotice', () => {
  const renderNotice = (orgSlug = 'acme') =>
    render(
      <UIProvider>
        <MemoryRouter>
          <GitNotConnectedNotice orgSlug={orgSlug} />
        </MemoryRouter>
      </UIProvider>,
    );

  it('renders the connect-a-Git-provider call to action', () => {
    renderNotice('acme');

    expect(screen.getByTestId('git-not-connected-notice')).toBeInTheDocument();
    expect(
      screen.getByText('Connect a Git provider first'),
    ).toBeInTheDocument();
  });

  it('deep-links to the Git provider settings page for the org', () => {
    renderNotice('acme');

    const link = screen.getByRole('link', {
      name: 'Connect a Git provider',
    });
    expect(link).toHaveAttribute('href', '/org/acme/settings/git');
  });
});
