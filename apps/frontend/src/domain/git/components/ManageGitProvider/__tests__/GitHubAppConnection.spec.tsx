import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { GitProviderId, OrganizationId } from '@packmind/types';
import { GitProviderUI } from '../../../types/GitProviderTypes';
import {
  GitHubAppInstallSlot,
  GitHubAppConnection,
} from '../GitHubAppConnection';
import {
  useGithubAppInstallUrlMutation,
  useGetGithubAppStatusQuery,
  useGetGithubAppManifestMutation,
} from '../../../api/queries/GitProviderQueries';
import { useGetMeQuery } from '../../../../accounts/api/queries/UserQueries';
import { navigateTo } from '../../../../../shared/utils/browserNavigation';

jest.mock('../../../../../shared/utils/browserNavigation', () => ({
  navigateTo: jest.fn(),
}));

jest.mock('../../../api/queries/GitProviderQueries', () => ({
  useGithubAppInstallUrlMutation: jest.fn(),
  useGetGithubAppStatusQuery: jest.fn(),
  useGetGithubAppManifestMutation: jest.fn(),
}));

jest.mock('../../../../accounts/api/queries/UserQueries', () => ({
  useGetMeQuery: jest.fn(),
}));

const mockOrganizationId = 'org-1' as OrganizationId;

const buildConnectedAppProvider = (
  overrides: Partial<GitProviderUI> = {},
): GitProviderUI => ({
  id: 'prov-1' as GitProviderId,
  source: 'github',
  organizationId: mockOrganizationId,
  hasAuth: true,
  url: 'https://github.com',
  authMethod: 'app',
  displayName: '',
  lastDistributionAt: null,
  ...overrides,
});

const createMockInstallUrlMutation = (
  overrides: Record<string, unknown> = {},
) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue({
    installUrl: 'https://github.com/apps/packmind/installations/new?state=abc',
    state: 'test-state-token',
  }),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  reset: jest.fn(),
  ...overrides,
});

const createMockManifestMutation = (
  overrides: Record<string, unknown> = {},
) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue({
    manifest: { name: 'Packmind', url: 'https://packmind.com' },
    state: 'manifest-state-abc',
    manifestPostUrl: 'https://github.com/settings/apps/new',
  }),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  reset: jest.fn(),
  ...overrides,
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('GitHubAppInstallSlot', () => {
  const mockUseGithubAppInstallUrlMutation =
    useGithubAppInstallUrlMutation as jest.MockedFunction<
      typeof useGithubAppInstallUrlMutation
    >;

  const mockLocalStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  };

  const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGithubAppInstallUrlMutation.mockReturnValue(
      createMockInstallUrlMutation() as ReturnType<
        typeof useGithubAppInstallUrlMutation
      >,
    );

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when rendered', () => {
    it('renders the install button with accessible name', () => {
      renderWithProviders(
        <GitHubAppInstallSlot organizationId={mockOrganizationId} />,
      );

      expect(
        screen.getByRole('button', { name: /install packmind on github/i }),
      ).toBeInTheDocument();
    });

    it('renders the helper text about GitHub navigation', () => {
      renderWithProviders(
        <GitHubAppInstallSlot organizationId={mockOrganizationId} />,
      );

      expect(
        screen.getByText(/this will take you to github/i),
      ).toBeInTheDocument();
    });
  });

  describe('when clicking the install button', () => {
    it('calls getGithubAppInstallUrl via the mutation', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({
        installUrl: 'https://github.com/apps/packmind/installations/new',
        state: 'test-state',
      });

      mockUseGithubAppInstallUrlMutation.mockReturnValue(
        createMockInstallUrlMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGithubAppInstallUrlMutation>,
      );

      renderWithProviders(
        <GitHubAppInstallSlot organizationId={mockOrganizationId} />,
      );

      await user.click(
        screen.getByRole('button', { name: /install packmind on github/i }),
      );

      expect(mockMutateAsync).toHaveBeenCalled();
    });

    it('navigates to the install URL via window.location.assign', async () => {
      const user = userEvent.setup();
      const installUrl =
        'https://github.com/apps/packmind/installations/new?state=abc';
      const mockMutateAsync = jest.fn().mockResolvedValue({
        installUrl,
        state: 'abc',
      });

      mockUseGithubAppInstallUrlMutation.mockReturnValue(
        createMockInstallUrlMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGithubAppInstallUrlMutation>,
      );

      renderWithProviders(
        <GitHubAppInstallSlot organizationId={mockOrganizationId} />,
      );

      await user.click(
        screen.getByRole('button', { name: /install packmind on github/i }),
      );

      expect(mockNavigateTo).toHaveBeenCalledTimes(1);
      expect(mockNavigateTo).toHaveBeenCalledWith(installUrl);
    });

    it('shows an error when the install URL mutation fails', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      mockUseGithubAppInstallUrlMutation.mockReturnValue(
        createMockInstallUrlMutation({
          mutateAsync: mockMutateAsync,
          isError: true,
          error: new Error('Network error'),
        }) as ReturnType<typeof useGithubAppInstallUrlMutation>,
      );

      renderWithProviders(
        <GitHubAppInstallSlot organizationId={mockOrganizationId} />,
      );

      await user.click(
        screen.getByRole('button', { name: /install packmind on github/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('when editingProvider is a connected GitHub App provider', () => {
    it('renders a "View Packmind on GitHub" link instead of the install button', async () => {
      const installUrl =
        'https://github.com/apps/packmind/installations/new?state=abc';
      const mockMutateAsync = jest.fn().mockResolvedValue({
        installUrl,
        state: 'abc',
      });

      mockUseGithubAppInstallUrlMutation.mockReturnValue(
        createMockInstallUrlMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGithubAppInstallUrlMutation>,
      );

      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          editingProvider={buildConnectedAppProvider()}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /view packmind on github/i }),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByRole('button', { name: /install packmind on github/i }),
      ).not.toBeInTheDocument();
    });

    it('opens the install URL in a new tab via the link', async () => {
      const installUrl =
        'https://github.com/apps/packmind/installations/new?state=abc';
      const mockMutateAsync = jest.fn().mockResolvedValue({
        installUrl,
        state: 'abc',
      });

      mockUseGithubAppInstallUrlMutation.mockReturnValue(
        createMockInstallUrlMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGithubAppInstallUrlMutation>,
      );

      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          editingProvider={buildConnectedAppProvider()}
        />,
      );

      const link = await screen.findByRole('link', {
        name: /view packmind on github/i,
      });
      expect(link).toHaveAttribute('href', installUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('still renders the install button when editingProvider is App but hasAuth is false', () => {
      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          editingProvider={buildConnectedAppProvider({ hasAuth: false })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /install packmind on github/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /view packmind on github/i }),
      ).not.toBeInTheDocument();
    });

    it('still renders the install button when editingProvider uses token auth', () => {
      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          editingProvider={buildConnectedAppProvider({ authMethod: 'token' })}
        />,
      );

      expect(
        screen.getByRole('button', { name: /install packmind on github/i }),
      ).toBeInTheDocument();
    });
  });
});

describe('GitHubAppConnection', () => {
  const mockUseGithubAppInstallUrlMutation =
    useGithubAppInstallUrlMutation as jest.MockedFunction<
      typeof useGithubAppInstallUrlMutation
    >;
  const mockUseGetGithubAppStatusQuery =
    useGetGithubAppStatusQuery as jest.MockedFunction<
      typeof useGetGithubAppStatusQuery
    >;
  const mockUseGetGithubAppManifestMutation =
    useGetGithubAppManifestMutation as jest.MockedFunction<
      typeof useGetGithubAppManifestMutation
    >;
  const mockUseGetMeQuery = useGetMeQuery as jest.MockedFunction<
    typeof useGetMeQuery
  >;

  const mockLocalStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  };

  const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGithubAppInstallUrlMutation.mockReturnValue(
      createMockInstallUrlMutation() as ReturnType<
        typeof useGithubAppInstallUrlMutation
      >,
    );
    mockUseGetGithubAppStatusQuery.mockReturnValue({
      data: { hasApp: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGetGithubAppStatusQuery>);
    mockUseGetGithubAppManifestMutation.mockReturnValue(
      createMockManifestMutation() as ReturnType<
        typeof useGetGithubAppManifestMutation
      >,
    );

    mockUseGetMeQuery.mockReturnValue({
      data: {
        authenticated: true,
        edition: 'oss',
        message: 'ok',
        user: {
          id: 'user-1',
          email: 'user@packmind.com',
          displayName: null,
          memberships: [],
        },
        organization: {
          id: mockOrganizationId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
          githubAppMode: 'on-prem',
        },
      },
    } as ReturnType<typeof useGetMeQuery>);

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when edition is cloud', () => {
    beforeEach(() => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: true,
          edition: 'cloud',
          message: 'ok',
          user: {
            id: 'user-1',
            email: 'user@packmind.com',
            displayName: null,
            memberships: [],
          },
          organization: {
            id: mockOrganizationId,
            name: 'Test Org',
            slug: 'test-org',
            role: 'admin',
            githubAppMode: 'shared',
          },
        },
      } as ReturnType<typeof useGetMeQuery>);
    });

    it('renders the install button without checking status', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.getByRole('button', { name: /install packmind on github/i }),
      ).toBeInTheDocument();
    });

    it('does not render the connect to github button', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.queryByRole('button', { name: /connect to github/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when edition is oss and status is loading', () => {
    beforeEach(() => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: true,
          edition: 'oss',
          message: 'ok',
          user: {
            id: 'user-1',
            email: 'user@packmind.com',
            displayName: null,
            memberships: [],
          },
          organization: {
            id: mockOrganizationId,
            name: 'Test Org',
            slug: 'test-org',
            role: 'admin',
            githubAppMode: 'on-prem',
          },
        },
      } as ReturnType<typeof useGetMeQuery>);

      mockUseGetGithubAppStatusQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useGetGithubAppStatusQuery>);
    });

    it('renders neither install nor connect button while loading', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.queryByRole('button', { name: /install packmind on github/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /connect to github/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when edition is oss and status query errored', () => {
    beforeEach(() => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: true,
          edition: 'oss',
          message: 'ok',
          user: {
            id: 'user-1',
            email: 'user@packmind.com',
            displayName: null,
            memberships: [],
          },
          organization: {
            id: mockOrganizationId,
            name: 'Test Org',
            slug: 'test-org',
            role: 'admin',
            githubAppMode: 'on-prem',
          },
        },
      } as ReturnType<typeof useGetMeQuery>);

      mockUseGetGithubAppStatusQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useGetGithubAppStatusQuery>);
    });

    it('renders an error alert', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.getByText(/failed to load github app status/i),
      ).toBeInTheDocument();
    });

    it('renders a retry button', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();
      mockUseGetGithubAppStatusQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useGetGithubAppStatusQuery>);

      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('when edition is oss and hasApp is false', () => {
    beforeEach(() => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: true,
          edition: 'oss',
          message: 'ok',
          user: {
            id: 'user-1',
            email: 'user@packmind.com',
            displayName: null,
            memberships: [],
          },
          organization: {
            id: mockOrganizationId,
            name: 'Test Org',
            slug: 'test-org',
            role: 'admin',
            githubAppMode: 'on-prem',
          },
        },
      } as ReturnType<typeof useGetMeQuery>);

      mockUseGetGithubAppStatusQuery.mockReturnValue({
        data: { hasApp: false },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useGetGithubAppStatusQuery>);
    });

    it('renders the connect to github button', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.getByRole('button', { name: /connect to github/i }),
      ).toBeInTheDocument();
    });

    it('does not render the install button', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.queryByRole('button', { name: /install packmind on github/i }),
      ).not.toBeInTheDocument();
    });

    it('calls manifest mutation on click', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({
        manifest: { name: 'Packmind', url: 'https://packmind.com' },
        state: 'state-xyz',
        manifestPostUrl: 'https://github.com/settings/apps/new',
      });

      mockUseGetGithubAppManifestMutation.mockReturnValue(
        createMockManifestMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGetGithubAppManifestMutation>,
      );

      jest
        .spyOn(HTMLFormElement.prototype, 'submit')
        .mockImplementation(() => undefined);

      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /connect to github/i }),
      );

      expect(mockMutateAsync).toHaveBeenCalled();
    });

    it('submits a hidden form to manifestPostUrl with encoded state on click', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({
        manifest: { name: 'Packmind' },
        state: 'state-xyz',
        manifestPostUrl: 'https://github.com/settings/apps/new',
      });

      mockUseGetGithubAppManifestMutation.mockReturnValue(
        createMockManifestMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGetGithubAppManifestMutation>,
      );

      const mockSubmit = jest
        .spyOn(HTMLFormElement.prototype, 'submit')
        .mockImplementation(() => undefined);

      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /connect to github/i }),
      );

      expect(mockSubmit).toHaveBeenCalled();
    });
  });

  describe('when edition is oss and hasApp is true', () => {
    beforeEach(() => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: true,
          edition: 'oss',
          message: 'ok',
          user: {
            id: 'user-1',
            email: 'user@packmind.com',
            displayName: null,
            memberships: [],
          },
          organization: {
            id: mockOrganizationId,
            name: 'Test Org',
            slug: 'test-org',
            role: 'admin',
            githubAppMode: 'on-prem',
          },
        },
      } as ReturnType<typeof useGetMeQuery>);

      mockUseGetGithubAppStatusQuery.mockReturnValue({
        data: { hasApp: true, appSlug: 'my-packmind-app' },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useGetGithubAppStatusQuery>);
    });

    it('renders the install button', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.getByRole('button', { name: /install packmind on github/i }),
      ).toBeInTheDocument();
    });

    it('does not render the connect to github button', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.queryByRole('button', { name: /connect to github/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render the revoke action (moved to Advanced panel)', () => {
      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.queryByRole('button', { name: /revoke app connection/i }),
      ).not.toBeInTheDocument();
    });

    it('renders the "View Packmind on GitHub" link when editingProvider is a connected App provider', async () => {
      const installUrl =
        'https://github.com/apps/packmind/installations/new?state=abc';
      const mockMutateAsync = jest.fn().mockResolvedValue({
        installUrl,
        state: 'abc',
      });

      mockUseGithubAppInstallUrlMutation.mockReturnValue(
        createMockInstallUrlMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGithubAppInstallUrlMutation>,
      );

      renderWithProviders(
        <GitHubAppConnection
          organizationId={mockOrganizationId}
          url="https://github.com"
          editingProvider={buildConnectedAppProvider()}
        />,
      );

      const link = await screen.findByRole('link', {
        name: /view packmind on github/i,
      });
      expect(link).toHaveAttribute('href', installUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(
        screen.queryByRole('button', { name: /install packmind on github/i }),
      ).not.toBeInTheDocument();
    });
  });
});
