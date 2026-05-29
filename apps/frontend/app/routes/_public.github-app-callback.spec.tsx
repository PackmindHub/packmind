import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useSearchParams } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import GithubAppCallbackRouteModule from './_public.github-app-callback';
import { useGetMeQuery } from '../../src/domain/accounts/api/queries';
import { useSubmitGithubAppCallbackMutation } from '../../src/domain/git/api/queries/GitProviderQueries';

jest.mock('../../src/domain/accounts/api/queries', () => ({
  useGetMeQuery: jest.fn(),
}));

jest.mock('../../src/domain/git/api/queries/GitProviderQueries', () => ({
  useSubmitGithubAppCallbackMutation: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
  useSearchParams: jest.fn(),
}));

const createMockMutation = (overrides: Record<string, unknown> = {}) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue({ id: 'prov-new' }),
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
  edition: 'cloud' as const,
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

const mockLocalStorage = {
  setItem: jest.fn(),
  getItem: jest.fn().mockReturnValue('stored-state-token'),
  removeItem: jest.fn(),
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

describe('GithubAppCallbackRouteModule', () => {
  const mockUseGetMeQuery = useGetMeQuery as jest.MockedFunction<
    typeof useGetMeQuery
  >;

  const mockUseSubmitGithubAppCallbackMutation =
    useSubmitGithubAppCallbackMutation as jest.MockedFunction<
      typeof useSubmitGithubAppCallbackMutation
    >;

  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >;

  const originalOpener = window.opener;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockUseGetMeQuery.mockReturnValue({
      data: authenticatedMe,
      isLoading: false,
    } as ReturnType<typeof useGetMeQuery>);

    mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
      createMockMutation() as ReturnType<
        typeof useSubmitGithubAppCallbackMutation
      >,
    );

    mockUseSearchParams.mockReturnValue([
      new URLSearchParams({
        installation_id: '12345',
        setup_action: 'install',
      }),
      jest.fn(),
    ]);

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    Object.defineProperty(window, 'opener', {
      value: { postMessage: jest.fn() },
      writable: true,
      configurable: true,
    });

    jest.spyOn(window, 'close').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    Object.defineProperty(window, 'opener', {
      value: originalOpener,
      writable: true,
      configurable: true,
    });
  });

  describe('when authenticated user has valid installation_id and state in localStorage', () => {
    it('calls the callback mutation with installationId and state', async () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as ReturnType<
          typeof useSubmitGithubAppCallbackMutation
        >,
      );

      mockLocalStorage.getItem.mockReturnValue('stored-state-token');

      renderWithProviders(<GithubAppCallbackRouteModule />);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          { installationId: 12345, state: 'stored-state-token' },
          expect.any(Object),
        );
      });
    });
  });

  describe('when the callback mutation succeeds', () => {
    it('calls window.opener.postMessage with the correct payload', async () => {
      const mockMutate = jest.fn().mockImplementation((_, options) => {
        options?.onSuccess?.({ id: 'prov-new' });
      });

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as ReturnType<
          typeof useSubmitGithubAppCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppCallbackRouteModule />);

      await waitFor(() => {
        expect(window.opener?.postMessage).toHaveBeenCalledWith(
          {
            type: 'packmind:github-app-installed',
            providerId: 'prov-new',
            orgId: 'org-1',
          },
          window.location.origin,
        );
      });
    });

    it('calls window.close after 50ms timeout', async () => {
      const mockMutate = jest.fn().mockImplementation((_, options) => {
        options?.onSuccess?.({ id: 'prov-new' });
      });

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as ReturnType<
          typeof useSubmitGithubAppCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppCallbackRouteModule />);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(window.close).toHaveBeenCalled();
    });

    it('removes the localStorage state key on success', async () => {
      const mockMutate = jest.fn().mockImplementation((_, options) => {
        options?.onSuccess?.({ id: 'prov-new' });
      });

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as ReturnType<
          typeof useSubmitGithubAppCallbackMutation
        >,
      );

      renderWithProviders(<GithubAppCallbackRouteModule />);

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
          'pm.gh-app.state.org-1',
        );
      });
    });
  });

  describe('when the callback mutation fails', () => {
    it('renders an error alert with the error message', () => {
      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({
          isError: true,
          error: new Error('Installation already exists'),
        }) as ReturnType<typeof useSubmitGithubAppCallbackMutation>,
      );

      renderWithProviders(<GithubAppCallbackRouteModule />);

      expect(
        screen.getByText(/installation already exists/i),
      ).toBeInTheDocument();
    });

    it('does not close the popup on error', () => {
      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({
          isError: true,
          error: new Error('Bad request'),
        }) as ReturnType<typeof useSubmitGithubAppCallbackMutation>,
      );

      renderWithProviders(<GithubAppCallbackRouteModule />);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(window.close).not.toHaveBeenCalled();
    });

    it('calls the mutation again when clicking Retry', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockMutate = jest.fn();
      const mockReset = jest.fn();

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({
          mutate: mockMutate,
          reset: mockReset,
          isError: true,
          error: new Error('Bad request'),
        }) as ReturnType<typeof useSubmitGithubAppCallbackMutation>,
      );

      renderWithProviders(<GithubAppCallbackRouteModule />);

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('when installation_id is missing', () => {
    it('renders the missing install context error', () => {
      mockUseSearchParams.mockReturnValue([
        new URLSearchParams({ setup_action: 'install' }),
        jest.fn(),
      ]);

      renderWithProviders(<GithubAppCallbackRouteModule />);

      expect(screen.getByText(/missing install context/i)).toBeInTheDocument();
    });

    it('does not call the mutation', () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as ReturnType<
          typeof useSubmitGithubAppCallbackMutation
        >,
      );

      mockUseSearchParams.mockReturnValue([
        new URLSearchParams({ setup_action: 'install' }),
        jest.fn(),
      ]);

      renderWithProviders(<GithubAppCallbackRouteModule />);

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('when user is not authenticated', () => {
    it('does not call the mutation', () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as ReturnType<
          typeof useSubmitGithubAppCallbackMutation
        >,
      );

      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: false,
          edition: 'cloud',
          message: 'not authenticated',
        },
        isLoading: false,
      } as ReturnType<typeof useGetMeQuery>);

      renderWithProviders(<GithubAppCallbackRouteModule />);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('redirects to sign-in when not authenticated', async () => {
      mockUseGetMeQuery.mockReturnValue({
        data: {
          authenticated: false,
          edition: 'cloud',
          message: 'not authenticated',
        },
        isLoading: false,
      } as ReturnType<typeof useGetMeQuery>);

      renderWithProviders(<GithubAppCallbackRouteModule />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('/sign-in?returnUrl='),
        );
      });
    });
  });

  describe('when effect runs twice (React 19 strict-mode double-mount)', () => {
    it('fires the mutation exactly once', async () => {
      const mockMutate = jest.fn();

      mockUseSubmitGithubAppCallbackMutation.mockReturnValue(
        createMockMutation({ mutate: mockMutate }) as ReturnType<
          typeof useSubmitGithubAppCallbackMutation
        >,
      );

      const { rerender } = renderWithProviders(
        <GithubAppCallbackRouteModule />,
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
              <GithubAppCallbackRouteModule />
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
