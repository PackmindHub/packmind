import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { LinkMarketplacePanel } from './LinkMarketplacePanel';

jest.mock('../../git/api/queries', () => ({
  useGetGitProvidersQuery: () => ({
    data: {
      providers: [
        { id: 'provider-1', source: 'github', url: 'https://github.com' },
      ],
    },
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

  it('opens the drawer straight onto the private link form', async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Link a marketplace' }),
      );
    });

    expect(
      await screen.findByRole('form', { name: 'Link a private marketplace' }),
    ).toBeInTheDocument();
  });

  it('does not expose the public marketplace path', async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Link a marketplace' }),
      );
    });

    await screen.findByRole('form', { name: 'Link a private marketplace' });
    expect(
      screen.queryByRole('tab', { name: 'Public' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('form', { name: 'Link a public marketplace' }),
    ).not.toBeInTheDocument();
  });
});
