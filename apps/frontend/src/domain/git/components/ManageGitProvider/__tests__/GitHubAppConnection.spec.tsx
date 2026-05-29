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
import { GitHubAppCloudInstallSlot } from '../GitHubAppConnection';
import { useGithubAppInstallUrlMutation } from '../../../api/queries/GitProviderQueries';
import { GET_GIT_PROVIDERS_KEY } from '../../../api/queryKeys';

jest.mock('../../../api/queries/GitProviderQueries', () => ({
  useGithubAppInstallUrlMutation: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));

const mockOrganizationId = 'org-1' as OrganizationId;

const createMockMutation = (overrides: Record<string, unknown> = {}) => ({
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

describe('GitHubAppCloudInstallSlot', () => {
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
      createMockMutation() as ReturnType<typeof useGithubAppInstallUrlMutation>,
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

  describe('when rendered in cloud edition', () => {
    it('renders the install button with accessible name', () => {
      renderWithProviders(
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      expect(
        screen.getByRole('button', { name: /install packmind on github/i }),
      ).toBeInTheDocument();
    });

    it('renders the helper text about popup', () => {
      renderWithProviders(
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
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
        createMockMutation({ mutateAsync: mockMutateAsync }) as ReturnType<
          typeof useGithubAppInstallUrlMutation
        >,
      );

      renderWithProviders(
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /install packmind on github/i }),
      );

      expect(mockMutateAsync).toHaveBeenCalled();
    });

    it('persists the returned state to localStorage under pm.gh-app.state.<orgId>', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({
        installUrl: 'https://github.com/apps/packmind/installations/new',
        state: 'my-secret-state',
      });

      mockUseGithubAppInstallUrlMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }) as ReturnType<
          typeof useGithubAppInstallUrlMutation
        >,
      );

      renderWithProviders(
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /install packmind on github/i }),
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        `pm.gh-app.state.${mockOrganizationId}`,
        'my-secret-state',
      );
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
        createMockMutation({ mutateAsync: mockMutateAsync }) as ReturnType<
          typeof useGithubAppInstallUrlMutation
        >,
      );

      renderWithProviders(
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
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
        createMockMutation({ mutateAsync: mockMutateAsync }) as ReturnType<
          typeof useGithubAppInstallUrlMutation
        >,
      );

      renderWithProviders(
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
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
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
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
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
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
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
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
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
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
        <GitHubAppCloudInstallSlot
          organizationId={mockOrganizationId}
          url="https://github.com"
        />,
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
