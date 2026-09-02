import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { createGitProviderId } from '@packmind/types';
import { ConnectionsTable } from './ConnectionsTable';
import { GitProviderUI } from '../../types/GitProviderTypes';

vi.mock('../../api/queries', () => ({
  useCheckProviderAuthQuery: () => ({
    isLoading: false,
    isFetching: true,
    isError: false,
    data: undefined,
    refetch: vi.fn(),
  }),
}));

const connection = {
  id: createGitProviderId('provider-1'),
  source: 'github',
  url: 'https://github.com',
  displayName: 'My connection',
  hasAuth: true,
  repos: [],
  lastDistributionAt: null,
} as unknown as GitProviderUI;

const renderTable = () =>
  render(
    <UIProvider>
      <ConnectionsTable
        connections={[connection]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    </UIProvider>,
  );

const emittedStyles = () =>
  Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .join('\n');

describe('ConnectionsTable', () => {
  it('renders a row per connection', () => {
    renderTable();

    expect(screen.getByTestId('git-connection-row')).toBeInTheDocument();
  });

  it('marks the refresh control as checking while the probe runs', () => {
    renderTable();

    expect(screen.getByTestId('connection-row-refresh')).toHaveAttribute(
      'aria-label',
      'Checking…',
    );
    expect(
      screen.getByTestId('connection-row-refresh-spinner'),
    ).toBeInTheDocument();
  });

  // Animating the refresh icon locally used to emit a second, malformed global
  // `@keyframes spin` that overrode the theme's and froze every spinner on the
  // page — the connection drawer's included.
  it('leaves the theme as the only definition of the spin keyframes', () => {
    renderTable();

    const definitions = emittedStyles().split('@keyframes spin{').slice(1);

    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toContain('transform:rotate(360deg)');
  });
});
