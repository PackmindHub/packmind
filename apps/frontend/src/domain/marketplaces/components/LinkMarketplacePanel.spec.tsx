import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { LinkMarketplacePanel } from './LinkMarketplacePanel';

jest.mock('../../git/api/queries', () => ({
  useGetGitProvidersQuery: () => ({
    data: { providers: [] },
    isLoading: false,
  }),
}));

jest.mock('../api/queries', () => ({
  useLinkMarketplace: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useValidateMarketplaceUrl: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: undefined,
  }),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LinkMarketplacePanel organizationId="org-1" orgSlug="acme" />
        </MemoryRouter>
      </QueryClientProvider>
    </UIProvider>,
  );
}

describe('LinkMarketplacePanel', () => {
  it('renders the "Link a marketplace" trigger button', () => {
    renderPanel();
    expect(
      screen.getByRole('button', { name: 'Link a marketplace' }),
    ).toBeInTheDocument();
  });

  it('opens the drawer with the private tab active by default', async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Link a marketplace' }),
      );
    });

    const privateTab = await screen.findByRole('tab', { name: 'Private' });
    expect(privateTab).toHaveAttribute('aria-selected', 'true');
    const publicTab = screen.getByRole('tab', { name: 'Public' });
    expect(publicTab).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to the public tab when the user clicks Public', async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Link a marketplace' }),
      );
    });

    const publicTab = await screen.findByRole('tab', { name: 'Public' });
    await act(async () => {
      fireEvent.click(publicTab);
    });

    expect(publicTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('form', { name: 'Link a public marketplace' }),
    ).toBeInTheDocument();
  });
});
