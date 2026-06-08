import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { GitProviderConnection } from '../GitProviderConnection';
import {
  useCreateGitProviderMutation,
  useUpdateGitProviderMutation,
} from '../../../api/queries';
import { useGetMeQuery } from '../../../../accounts/api/queries/UserQueries';
import { GitProviderUI } from '../../../types/GitProviderTypes';
import { GitProviderId, OrganizationId } from '@packmind/types';

jest.mock('../../../api/queries', () => ({
  useCreateGitProviderMutation: jest.fn(),
  useUpdateGitProviderMutation: jest.fn(),
}));

jest.mock('../../../api/queries/GitProviderQueries', () => ({
  useCreateGitProviderMutation: jest.fn(),
  useUpdateGitProviderMutation: jest.fn(),
  useGithubAppInstallUrlMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  })),
  useSubmitGithubAppCallbackMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  })),
  useGetGithubAppStatusQuery: jest.fn(() => ({
    data: { hasApp: false },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  useGetGithubAppManifestMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  })),
  useRevokeGithubAppMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  })),
}));

jest.mock('../../../../accounts/api/queries/UserQueries', () => ({
  useGetMeQuery: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

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

const createMockMutation = <T = unknown,>(overrides = {}) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue({ id: 'prov-1' }),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  }) as T;

const mockOrganizationId = 'org-1' as OrganizationId;

const mockGitProviderUI = (
  overrides: Partial<GitProviderUI> = {},
): GitProviderUI => ({
  id: 'prov-1' as GitProviderId,
  source: 'github',
  organizationId: mockOrganizationId,
  hasAuth: true,
  url: 'https://github.com',
  displayName: '',
  lastDeploymentAt: null,
  ...overrides,
});

describe('GitProviderConnection', () => {
  const mockUseCreateGitProviderMutation =
    useCreateGitProviderMutation as jest.MockedFunction<
      typeof useCreateGitProviderMutation
    >;
  const mockUseUpdateGitProviderMutation =
    useUpdateGitProviderMutation as jest.MockedFunction<
      typeof useUpdateGitProviderMutation
    >;
  const mockUseGetMeQuery = useGetMeQuery as jest.MockedFunction<
    typeof useGetMeQuery
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCreateGitProviderMutation.mockReturnValue(
      createMockMutation<ReturnType<typeof useCreateGitProviderMutation>>(),
    );
    mockUseUpdateGitProviderMutation.mockReturnValue(
      createMockMutation<ReturnType<typeof useUpdateGitProviderMutation>>(),
    );

    // Default: OSS user with feature flag ON
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
  });

  describe('when source is github and feature flag is enabled', () => {
    it('defaults to the GitHub App tab as active', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      const appTab = screen.getByRole('tab', { name: /github app/i });
      expect(appTab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows Personal Access Token tab as not selected by default', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      const tokenTab = screen.getByRole('tab', {
        name: /personal access token/i,
      });
      expect(tokenTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('when switching to Personal Access Token tab', () => {
    it('shows the legacy token input', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      const tokenTab = screen.getByRole('tab', {
        name: /personal access token/i,
      });
      await user.click(tokenTab);

      // After switching to PAT tab, the access-token password input is visible
      expect(screen.getByPlaceholderText(/ghp_/i)).toBeInTheDocument();
    });

    it('activates the Personal Access Token tab after clicking it', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      const tokenTab = screen.getByRole('tab', {
        name: /personal access token/i,
      });
      await user.click(tokenTab);

      expect(tokenTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('when vendor is gitlab', () => {
    it('renders no tabs', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      const vendorSelect = screen.getByRole('combobox');
      await user.selectOptions(vendorSelect, 'gitlab');

      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('shows the token field directly without tabs', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      const vendorSelect = screen.getByRole('combobox');
      await user.selectOptions(vendorSelect, 'gitlab');

      expect(screen.getByPlaceholderText(/glpat-/i)).toBeInTheDocument();
    });
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

    it('shows the cloud install button in the App tab', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(
        screen.getByRole('button', { name: /install packmind on github/i }),
      ).toBeInTheDocument();
    });

    it('does not render the OSS manual form inputs', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(
        screen.queryByLabelText(/installation id/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('when feature flag is OFF (external domain user)', () => {
    beforeEach(() => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: true,
          edition: 'cloud',
          message: 'ok',
          user: {
            id: 'user-2',
            email: 'user@externaldomain.com',
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

    it('renders no tab triggers for github source', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('shows the legacy Access Token input directly', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(screen.getByPlaceholderText(/ghp_/i)).toBeInTheDocument();
    });

    it('does not render Installation ID input', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(
        screen.queryByLabelText(/installation id/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('when feature flag is ON and source is github', () => {
    it('renders two tab triggers', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('has GitHub App as the active tab by default', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(screen.getByRole('tab', { name: /github app/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  describe('when editing an existing App provider with flag ON', () => {
    it('pins the App tab as active on mount', () => {
      const editingProvider = mockGitProviderUI({ authMethod: 'app' });

      renderWithProviders(
        <GitProviderConnection
          organizationId={mockOrganizationId}
          editingProvider={editingProvider}
        />,
      );

      expect(screen.getByRole('tab', { name: /github app/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  describe('when editing an existing Token provider with flag ON', () => {
    it('pins the Personal Access Token tab as active on mount', () => {
      const editingProvider = mockGitProviderUI({ authMethod: 'token' });

      renderWithProviders(
        <GitProviderConnection
          organizationId={mockOrganizationId}
          editingProvider={editingProvider}
        />,
      );

      expect(
        screen.getByRole('tab', { name: /personal access token/i }),
      ).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('when OSS edition and GitHub App tab is active', () => {
    it('does not render installation ID input (manual form is gone)', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(
        screen.queryByLabelText(/installation id/i),
      ).not.toBeInTheDocument();
    });

    it('renders the connect to github button when app is not registered', () => {
      renderWithProviders(
        <GitProviderConnection organizationId={mockOrganizationId} />,
      );

      expect(
        screen.getByRole('button', { name: /connect to github/i }),
      ).toBeInTheDocument();
    });
  });
});
