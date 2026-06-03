import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useSearchParams } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import GithubAppManifestCallbackRouteModule from './_public.integrations.github-app.manifest-callback';
import { useGetMeQuery } from '../../src/domain/accounts/api/queries';
import { useSubmitGithubAppManifestCallbackMutation } from '../../src/domain/git/api/queries/GitProviderQueries';

jest.mock('../../src/domain/accounts/api/queries', () => ({
  useGetMeQuery: jest.fn(),
}));

jest.mock('../../src/domain/git/api/queries/GitProviderQueries', () => ({
  useSubmitGithubAppManifestCallbackMutation: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
  useSearchParams: jest.fn(),
}));

const createMockMutation = (overrides: Record<string, unknown> = {}) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue({
    installUrl: 'https://github.com/apps/test/installations/new',
  }),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  reset: jest.fn(),
  ...overrides,
});

const authenticatedMe = {
  authenticated: true as const,
  message: 'ok',
  edition: 'oss' as const,
  user: {
    id: 'user-1',
    email: 'user@packmind.com',
    displayName: null,
    memberships: [],
  },
  organization: {
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    role: 'ADMIN' as const,
  },
};

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

describe('GithubAppManifestCallbackRouteModule', () => {
  const mockUseGetMeQuery = useGetMeQuery as jest.MockedFunction<
    typeof useGetMeQuery
  >;

  const mockUseSubmitGithubAppManifestCallbackMutation =
    useSubmitGithubAppManifestCallbackMutation as jest.MockedFunction<
      typeof useSubmitGithubAppManifestCallbackMutation
    >;

  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockUseGetMeQuery.mockReturnValue({
      data: authenticatedMe,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetMeQuery>);

    mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
      createMockMutation() as unknown as ReturnType<
        typeof useSubmitGithubAppManifestCallbackMutation
      >,
    );

    mockUseSearchParams.mockReturnValue([
      new URLSearchParams({
        code: 'gh-manifest-code-abc',
        state: 'signed-state-token',
      }),
      jest.fn(),
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('when authenticated user has valid code and state query params', () => {
    it('calls the manifest callback mutation with code and state', async () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          code: 'gh-manifest-code-abc',
          state: 'signed-state-token',
        });
      });
    });
  });

  describe('when the manifest callback mutation succeeds', () => {
    it('renders the redirecting copy when isSuccess is true', () => {
      const installUrl = 'https://github.com/apps/test/installations/new';

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({
          isSuccess: true,
          data: { installUrl },
        }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(screen.getByText(/redirecting to github/i)).toBeInTheDocument();
    });

    it('renders the manual fallback link with the correct href when isSuccess is true', () => {
      const installUrl = 'https://github.com/apps/test/installations/new';

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({
          isSuccess: true,
          data: { installUrl },
        }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      const link = screen.getByRole('link', {
        name: /click here to continue/i,
      });
      expect(link).toHaveAttribute('href', installUrl);
    });
  });

  describe('when the manifest callback mutation fails', () => {
    it('renders an error alert with the error message', () => {
      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({
          isError: true,
          error: new Error('Invalid state signature'),
        }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(screen.getByText(/invalid state signature/i)).toBeInTheDocument();
    });

    it('renders a generic error message when the error has no message', () => {
      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({
          isError: true,
          error: new Error(),
        }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(
        screen.getByText(/couldn't connect to packmind/i),
      ).toBeInTheDocument();
    });

    it('resets mutation state when clicking Try again', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockReset = jest.fn();

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({
          reset: mockReset,
          isError: true,
          error: new Error('Server error'),
        }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('when the mutation fails with a 401 auth error', () => {
    it('renders the authentication required error UI', () => {
      const authError = Object.assign(new Error('Unauthorized'), {
        status: 401,
      });

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({
          isError: true,
          error: authError,
        }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(screen.getByText('Authentication required')).toBeInTheDocument();
    });

    it('renders a sign-in button when authentication fails', () => {
      const authError = Object.assign(new Error('Unauthorized'), {
        status: 401,
      });

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({
          isError: true,
          error: authError,
        }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when code is missing from query params', () => {
    it('renders the missing manifest context error', () => {
      mockUseSearchParams.mockReturnValue([
        new URLSearchParams({ state: 'signed-state-token' }),
        jest.fn(),
      ]);

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(screen.getByText('Missing manifest context')).toBeInTheDocument();
    });

    it('does not call the mutation', () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      mockUseSearchParams.mockReturnValue([
        new URLSearchParams({ state: 'signed-state-token' }),
        jest.fn(),
      ]);

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('when state is missing from query params', () => {
    it('renders the missing manifest context error', () => {
      mockUseSearchParams.mockReturnValue([
        new URLSearchParams({ code: 'gh-manifest-code-abc' }),
        jest.fn(),
      ]);

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(screen.getByText('Missing manifest context')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('does not call the mutation', () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: false,
          edition: 'oss',
          message: 'not authenticated',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useGetMeQuery>);

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('redirects to sign-in when not authenticated', async () => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: false,
          edition: 'oss',
          message: 'not authenticated',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useGetMeQuery>);

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('/sign-in?returnUrl='),
        );
      });
    });
  });

  describe('when the mutation has not been called yet', () => {
    it('renders the initializing state when the organization is missing', () => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          ...authenticatedMe,
          organization: undefined,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useGetMeQuery>);

      renderWithProviders(<GithubAppManifestCallbackRouteModule />);

      expect(screen.getByText(/initializing/i)).toBeInTheDocument();
    });
  });

  describe('when effect runs twice (React 19 strict-mode double-mount)', () => {
    it('fires the mutation exactly once', async () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppManifestCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as unknown as ReturnType<
          typeof useSubmitGithubAppManifestCallbackMutation
        >,
      );

      const { rerender } = renderWithProviders(
        <GithubAppManifestCallbackRouteModule />,
      );

      rerender(
        <MemoryRouter>
          <UIProvider>
            <QueryClientProvider
              client={
                new QueryClient({
                  defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                  },
                })
              }
            >
              <GithubAppManifestCallbackRouteModule />
            </QueryClientProvider>
          </UIProvider>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });
    });
  });
});
