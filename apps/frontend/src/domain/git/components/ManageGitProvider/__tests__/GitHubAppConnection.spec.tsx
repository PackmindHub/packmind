import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import {
  GitHubAppInstallSlot,
  GitHubAppConnection,
} from '../GitHubAppConnection';
import {
  useGithubAppInstallUrlMutation,
  useGetGithubAppStatusQuery,
  useGetGithubAppManifestMutation,
} from '../../../api/queries/GitProviderQueries';
import { GET_GIT_PROVIDERS_KEY } from '../../../api/queryKeys';
import { useGetMeQuery } from '../../../../accounts/api/queries/UserQueries';

jest.mock('../../../api/queries/GitProviderQueries', () => ({
  useGithubAppInstallUrlMutation: jest.fn(),
  useGetGithubAppStatusQuery: jest.fn(),
  useGetGithubAppManifestMutation: jest.fn(),
}));

jest.mock('../../../../accounts/api/queries/UserQueries', () => ({
  useGetMeQuery: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));

const mockOrganizationId = 'org-1' as OrganizationId;

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

  const mockUseQueryClient = useQueryClient as jest.MockedFunction<
    typeof useQueryClient
  >;

  const mockInvalidateQueries = jest.fn();
  const mockWindowOpen = jest.fn();
  const mockLocalStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGithubAppInstallUrlMutation.mockReturnValue(
      createMockInstallUrlMutation() as ReturnType<
        typeof useGithubAppInstallUrlMutation
      >,
    );

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as unknown as ReturnType<typeof useQueryClient>);

    jest
      .spyOn(window, 'open')
      .mockImplementation(mockWindowOpen.mockReturnValue({} as Window));

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

    it('renders the helper text about popup', () => {
      renderWithProviders(
        <GitHubAppInstallSlot organizationId={mockOrganizationId} />,
      );

      expect(
        screen.getByText(/this will open a github install popup/i),
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

    it('opens a popup with the returned install URL and correct target and dimensions', async () => {
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

      expect(mockWindowOpen).toHaveBeenCalledWith(
        installUrl,
        'packmind-gh-app',
        'width=900,height=750',
      );
    });

    it('shows popup blocked error when window.open returns null', async () => {
      const user = userEvent.setup();
      mockWindowOpen.mockReturnValue(null);
      jest.spyOn(window, 'open').mockReturnValue(null);

      const mockMutateAsync = jest.fn().mockResolvedValue({
        installUrl: 'https://github.com/apps/packmind/installations/new',
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

      await waitFor(() => {
        expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
      });
    });
  });

  describe('when receiving a message event', () => {
    it('invalidates GET_GIT_PROVIDERS_KEY query when receiving a valid same-origin message', async () => {
      const mockOnClose = jest.fn();
      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          onClose={mockOnClose}
        />,
      );

      await act(async () => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              type: 'packmind:github-app-installed',
              providerId: 'prov-new',
              orgId: mockOrganizationId,
            },
          }),
        );
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: GET_GIT_PROVIDERS_KEY,
      });
    });

    it('calls onClose when receiving a valid same-origin message', async () => {
      const mockOnClose = jest.fn();
      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          onClose={mockOnClose}
        />,
      );

      await act(async () => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              type: 'packmind:github-app-installed',
              providerId: 'prov-new',
              orgId: mockOrganizationId,
            },
          }),
        );
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('ignores a message event with a different origin', async () => {
      const mockOnClose = jest.fn();
      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          onClose={mockOnClose}
        />,
      );

      await act(async () => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://evil.example.com',
            data: {
              type: 'packmind:github-app-installed',
              providerId: 'prov-new',
              orgId: mockOrganizationId,
            },
          }),
        );
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('ignores a message event with a mismatched orgId', async () => {
      const mockOnClose = jest.fn();
      renderWithProviders(
        <GitHubAppInstallSlot
          organizationId={mockOrganizationId}
          onClose={mockOnClose}
        />,
      );

      await act(async () => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              type: 'packmind:github-app-installed',
              providerId: 'prov-new',
              orgId: 'org-different',
            },
          }),
        );
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('when component unmounts', () => {
    it('removes the message listener so dispatched messages no longer trigger invalidation', async () => {
      const { unmount } = renderWithProviders(
        <GitHubAppInstallSlot organizationId={mockOrganizationId} />,
      );

      unmount();

      await act(async () => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              type: 'packmind:github-app-installed',
              providerId: 'prov-new',
              orgId: mockOrganizationId,
            },
          }),
        );
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
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
  const mockUseQueryClient = useQueryClient as jest.MockedFunction<
    typeof useQueryClient
  >;

  const mockLocalStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  };

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
      },
    } as ReturnType<typeof useGetMeQuery>);

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    } as unknown as ReturnType<typeof useQueryClient>);

    jest.spyOn(window, 'open').mockReturnValue({} as Window);

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

      // Prevent actual form submission
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
  });
});
