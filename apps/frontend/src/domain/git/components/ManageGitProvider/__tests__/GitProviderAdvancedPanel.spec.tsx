import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  GitProviderId,
  OrganizationId,
  GitProviderVendor,
} from '@packmind/types';
import { GitProviderAdvancedPanel } from '../GitProviderAdvancedPanel';
import { GitProviderUI } from '../../../types/GitProviderTypes';
import { useRevokeGithubAppMutation } from '../../../api/queries/GitProviderQueries';

jest.mock('../../../api/queries/GitProviderQueries', () => ({
  useRevokeGithubAppMutation: jest.fn(),
}));

const mockUseRevokeGithubAppMutation =
  useRevokeGithubAppMutation as jest.MockedFunction<
    typeof useRevokeGithubAppMutation
  >;

const createMockRevokeMutation = (overrides: Record<string, unknown> = {}) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue(undefined),
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

const githubProvider: GitProviderUI = {
  id: 'provider-1' as GitProviderId,
  source: 'github' as GitProviderVendor,
  organizationId: 'org-1' as OrganizationId,
  hasAuth: true,
  url: 'https://github.com',
  displayName: '',
};

const gitlabProvider: GitProviderUI = {
  ...githubProvider,
  source: 'gitlab' as GitProviderVendor,
};

describe('GitProviderAdvancedPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRevokeGithubAppMutation.mockReturnValue(
      createMockRevokeMutation() as ReturnType<
        typeof useRevokeGithubAppMutation
      >,
    );
  });

  describe('for a github provider', () => {
    it('renders the revoke section heading and explanatory copy', () => {
      renderWithProviders(
        <GitProviderAdvancedPanel
          editingProvider={githubProvider}
          onRevoked={jest.fn()}
        />,
      );

      expect(
        screen.getByRole('heading', { name: /revoke app connection/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/removes packmind's stored credentials/i),
      ).toBeInTheDocument();
    });

    it('renders the revoke trigger button', () => {
      renderWithProviders(
        <GitProviderAdvancedPanel
          editingProvider={githubProvider}
          onRevoked={jest.fn()}
        />,
      );

      expect(
        screen.getByRole('button', { name: /revoke app connection/i }),
      ).toBeInTheDocument();
    });

    it('opens a confirm dialog when the revoke button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <GitProviderAdvancedPanel
          editingProvider={githubProvider}
          onRevoked={jest.fn()}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /revoke app connection/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole('heading', {
            name: /revoke github app connection/i,
          }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText(/packmind will stop using these credentials/i),
      ).toBeInTheDocument();
    });

    it('calls the revoke mutation and onRevoked when confirmed', async () => {
      const user = userEvent.setup();
      const onRevoked = jest.fn();
      const mutateAsync = jest.fn().mockResolvedValue(undefined);
      mockUseRevokeGithubAppMutation.mockReturnValue(
        createMockRevokeMutation({ mutateAsync }) as ReturnType<
          typeof useRevokeGithubAppMutation
        >,
      );

      renderWithProviders(
        <GitProviderAdvancedPanel
          editingProvider={githubProvider}
          onRevoked={onRevoked}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /revoke app connection/i }),
      );

      const confirmButton = await screen.findByRole('button', {
        name: /^revoke$/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(onRevoked).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('for a non-github provider', () => {
    it('renders an empty-state message and no revoke button', () => {
      renderWithProviders(
        <GitProviderAdvancedPanel
          editingProvider={gitlabProvider}
          onRevoked={jest.fn()}
        />,
      );

      expect(
        screen.getByText(/nothing to manage here yet/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /revoke app connection/i }),
      ).not.toBeInTheDocument();
    });
  });
});
