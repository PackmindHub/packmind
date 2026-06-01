import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { PrivateLinkForm } from './PrivateLinkForm';

const useGetGitProvidersQueryMock = jest.fn();
const useLinkMarketplaceMock = jest.fn();

jest.mock('../../git/api/queries', () => ({
  useGetGitProvidersQuery: () => useGetGitProvidersQueryMock(),
}));

jest.mock('../api/queries', () => ({
  useLinkMarketplace: (...args: unknown[]) => useLinkMarketplaceMock(...args),
}));

function renderForm(overrides: { onLinked?: () => void } = {}) {
  const onLinked = overrides.onLinked ?? jest.fn();
  const onCancel = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PrivateLinkForm
            organizationId="org-1"
            orgSlug="acme"
            onLinked={onLinked}
            onCancel={onCancel}
          />
        </MemoryRouter>
      </QueryClientProvider>
    </UIProvider>,
  );

  return { onLinked, onCancel };
}

describe('PrivateLinkForm', () => {
  beforeEach(() => {
    useGetGitProvidersQueryMock.mockReturnValue({
      data: {
        providers: [
          {
            id: 'gp-1',
            source: 'github',
            url: 'https://github.com',
            organizationId: 'org-1',
            hasToken: true,
          },
        ],
      },
      isLoading: false,
    });

    useLinkMarketplaceMock.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ name: 'Acme Playbook' }),
      isPending: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading state while providers load', () => {
    useGetGitProvidersQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderForm();
    expect(
      screen.getByText('Loading your connected Git providers…'),
    ).toBeInTheDocument();
  });

  it('shows the GitNotConnectedNotice when no providers are connected', () => {
    useGetGitProvidersQueryMock.mockReturnValue({
      data: { providers: [] },
      isLoading: false,
    });

    renderForm();
    expect(screen.getByTestId('git-not-connected-notice')).toBeInTheDocument();
  });

  it('renders the form when at least one provider is connected', () => {
    renderForm();
    expect(
      screen.getByRole('form', { name: 'Link a private marketplace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Git provider')).toBeInTheDocument();
  });

  it('disables the submit button until every field is populated', () => {
    renderForm();
    const submit = screen.getByRole('button', { name: 'Link marketplace' });
    expect(submit).toBeDisabled();
  });

  it('does not render a separate display-name field', () => {
    renderForm();
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
  });

  it('calls useLinkMarketplace.mutateAsync with the repo name as the display name on submit', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ name: 'marketplace' });
    useLinkMarketplaceMock.mockReturnValue({ mutateAsync, isPending: false });

    const onLinked = jest.fn();
    renderForm({ onLinked });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'gp-1' },
    });
    fireEvent.change(screen.getByLabelText('Repository owner'), {
      target: { value: '  acme-eng  ' },
    });
    fireEvent.change(screen.getByLabelText('Repository name'), {
      target: { value: '  marketplace  ' },
    });
    fireEvent.change(screen.getByLabelText('Branch'), {
      target: { value: 'main' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Link marketplace' }));
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      gitProviderId: 'gp-1',
      owner: 'acme-eng',
      repo: 'marketplace',
      branch: 'main',
      name: 'marketplace',
    });
    expect(onLinked).toHaveBeenCalled();
  });
});
