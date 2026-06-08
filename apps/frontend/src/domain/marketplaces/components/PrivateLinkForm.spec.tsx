import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { PrivateLinkForm } from './PrivateLinkForm';

const useGetGitProvidersQueryMock = jest.fn();
const useGetAvailableRepositoriesQueryMock = jest.fn();
const useLinkMarketplaceMock = jest.fn();

jest.mock('../../git/api/queries', () => ({
  useGetGitProvidersQuery: () => useGetGitProvidersQueryMock(),
  useGetAvailableRepositoriesQuery: (...args: unknown[]) =>
    useGetAvailableRepositoriesQueryMock(...args),
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
            hasAuth: true,
            authMethod: 'token',
            displayName: '',
          },
        ],
      },
      isLoading: false,
    });

    useGetAvailableRepositoriesQueryMock.mockReturnValue({
      data: [
        {
          owner: 'acme-eng',
          name: 'marketplace',
          fullName: 'acme-eng/marketplace',
          private: true,
          defaultBranch: 'main',
          stars: 0,
        },
        {
          owner: 'group1/subgroup2',
          name: 'project3',
          fullName: 'group1/subgroup2/project3',
          private: true,
          defaultBranch: 'develop',
          stars: 0,
        },
      ],
      isLoading: false,
      isError: false,
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
      screen.getByText('Loading your Git connections…'),
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

  it('excludes CLI-managed providers (no credentials) from the dropdown', () => {
    useGetGitProvidersQueryMock.mockReturnValue({
      data: {
        providers: [
          {
            id: 'gp-1',
            source: 'github',
            url: 'https://github.com',
            organizationId: 'org-1',
            hasAuth: true,
            authMethod: 'token',
            displayName: '',
          },
          {
            id: 'gp-cli',
            source: 'gitlab',
            url: 'https://gitlab.com',
            organizationId: 'org-1',
            hasAuth: false,
            authMethod: 'token',
            displayName: '',
          },
        ],
      },
      isLoading: false,
    });

    renderForm();
    const options = screen
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);
    expect(options).toContain('gp-1');
    expect(options).not.toContain('gp-cli');
  });

  it('shows the GitNotConnectedNotice when only CLI-managed providers exist', () => {
    useGetGitProvidersQueryMock.mockReturnValue({
      data: {
        providers: [
          {
            id: 'gp-cli',
            source: 'gitlab',
            url: 'https://gitlab.com',
            organizationId: 'org-1',
            hasAuth: false,
            authMethod: 'token',
            displayName: '',
          },
        ],
      },
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
    expect(screen.getByText('Git connection')).toBeInTheDocument();
  });

  it('labels a connection with its display name when one is set', () => {
    useGetGitProvidersQueryMock.mockReturnValue({
      data: {
        providers: [
          {
            id: 'gp-1',
            source: 'github',
            url: 'https://github.com',
            organizationId: 'org-1',
            hasAuth: true,
            authMethod: 'token',
            displayName: 'Acme Engineering',
          },
        ],
      },
      isLoading: false,
    });

    renderForm();
    expect(
      screen.getByRole('option', { name: 'Acme Engineering' }),
    ).toBeInTheDocument();
  });

  it('falls back to vendor and URL when the display name is empty', () => {
    renderForm();
    expect(
      screen.getByRole('option', { name: 'GITHUB — https://github.com' }),
    ).toBeInTheDocument();
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

  it('lists repositories from the selected provider instead of free-text inputs', () => {
    renderForm();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'gp-1' },
    });

    expect(screen.queryByLabelText('Repository owner')).not.toBeInTheDocument();
    expect(screen.getByText('acme-eng/marketplace')).toBeInTheDocument();
    expect(screen.getByText('group1/subgroup2/project3')).toBeInTheDocument();
  });

  it('submits the selected repo coordinates resolved by the provider', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ name: 'project3' });
    useLinkMarketplaceMock.mockReturnValue({ mutateAsync, isPending: false });

    const onLinked = jest.fn();
    renderForm({ onLinked });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'gp-1' },
    });
    // A GitLab-style repo whose owner is a group/subgroup path — exactly the
    // case the manual form got wrong.
    fireEvent.click(
      screen.getByTestId('marketplace-repo-option-group1/subgroup2/project3'),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Link marketplace' }));
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      gitProviderId: 'gp-1',
      owner: 'group1/subgroup2',
      repo: 'project3',
      branch: 'develop',
      name: 'project3',
    });
    expect(onLinked).toHaveBeenCalled();
  });

  it('keeps the submit button disabled until a repository is selected', () => {
    renderForm();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'gp-1' },
    });
    expect(
      screen.getByRole('button', { name: 'Link marketplace' }),
    ).toBeDisabled();
  });
});
