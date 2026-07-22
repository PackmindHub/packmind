import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { GitHubAppAuthBlock } from '../GitHubAppAuthBlock';
import {
  useGetGithubAppManifestMutation,
  useGetGithubAppStatusQuery,
  useGithubAppInstallUrlMutation,
  useRevokeGithubAppMutation,
} from '../../../api/queries/GitProviderQueries';

jest.mock('../../../api/queries/GitProviderQueries', () => ({
  useGetGithubAppManifestMutation: jest.fn(),
  useGetGithubAppStatusQuery: jest.fn(),
  useGithubAppInstallUrlMutation: jest.fn(),
  useRevokeGithubAppMutation: jest.fn(),
}));

jest.mock('../../../../../shared/utils/navigation', () => ({
  redirectTo: jest.fn(),
}));

const mockOrganizationId = 'org-1' as OrganizationId;

const createMockMutation = (overrides: Record<string, unknown> = {}) => ({
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

describe('GitHubAppAuthBlock', () => {
  const mockUseGetGithubAppManifestMutation =
    useGetGithubAppManifestMutation as jest.MockedFunction<
      typeof useGetGithubAppManifestMutation
    >;
  const mockUseGetGithubAppStatusQuery =
    useGetGithubAppStatusQuery as jest.MockedFunction<
      typeof useGetGithubAppStatusQuery
    >;
  const mockUseGithubAppInstallUrlMutation =
    useGithubAppInstallUrlMutation as jest.MockedFunction<
      typeof useGithubAppInstallUrlMutation
    >;
  const mockUseRevokeGithubAppMutation =
    useRevokeGithubAppMutation as jest.MockedFunction<
      typeof useRevokeGithubAppMutation
    >;

  const renderRegistrationBlock = () =>
    renderWithProviders(
      <GitHubAppAuthBlock
        organizationId={mockOrganizationId}
        githubAppMode="on-prem"
      />,
    );

  const registerButton = () =>
    screen.getByRole('button', { name: /register the packmind github app/i });

  const orgInput = () =>
    screen.getByRole('textbox', { name: /github organization/i });

  beforeEach(() => {
    mockUseGetGithubAppManifestMutation.mockReturnValue(
      createMockMutation() as ReturnType<
        typeof useGetGithubAppManifestMutation
      >,
    );
    mockUseGithubAppInstallUrlMutation.mockReturnValue(
      createMockMutation() as ReturnType<typeof useGithubAppInstallUrlMutation>,
    );
    mockUseRevokeGithubAppMutation.mockReturnValue(
      createMockMutation() as ReturnType<typeof useRevokeGithubAppMutation>,
    );
    mockUseGetGithubAppStatusQuery.mockReturnValue({
      data: { hasApp: false },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetGithubAppStatusQuery>);

    jest
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('when the organization input is left empty', () => {
    it('requests the manifest without a githubOrg', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({
        manifest: { name: 'Packmind' },
        state: 'state-xyz',
        manifestPostUrl: 'https://github.com/settings/apps/new',
      });
      mockUseGetGithubAppManifestMutation.mockReturnValue(
        createMockMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGetGithubAppManifestMutation>,
      );

      renderRegistrationBlock();
      await user.click(registerButton());

      expect(mockMutateAsync).toHaveBeenCalledWith({ githubOrg: undefined });
    });

    it('does not show a validation message', () => {
      renderRegistrationBlock();

      expect(
        screen.queryByText(/enter a valid organization slug/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('when a valid organization slug is typed', () => {
    it('requests the manifest with the githubOrg', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn().mockResolvedValue({
        manifest: { name: 'Packmind' },
        state: 'state-xyz',
        manifestPostUrl:
          'https://github.com/organizations/my-company/settings/apps/new',
      });
      mockUseGetGithubAppManifestMutation.mockReturnValue(
        createMockMutation({
          mutateAsync: mockMutateAsync,
        }) as ReturnType<typeof useGetGithubAppManifestMutation>,
      );

      renderRegistrationBlock();
      await user.type(orgInput(), 'my-company');
      await user.click(registerButton());

      expect(mockMutateAsync).toHaveBeenCalledWith({
        githubOrg: 'my-company',
      });
    });
  });

  describe('when the slug is invalid', () => {
    it('shows a validation message', async () => {
      const user = userEvent.setup();
      renderRegistrationBlock();

      await user.type(orgInput(), '-bad-');

      expect(
        screen.getByText(/enter a valid organization slug/i),
      ).toBeInTheDocument();
    });

    it('disables the register button', async () => {
      const user = userEvent.setup();
      renderRegistrationBlock();

      await user.type(orgInput(), '-bad-');

      expect(registerButton()).toBeDisabled();
    });
  });
});
