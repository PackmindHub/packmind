import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { OrganizationHomePage } from './OrganizationHomePage';
import { useAuthContext } from '../hooks/useAuthContext';
import { useGetOnboardingStatusQuery } from '../api/queries/AccountsQueries';
import { useCreateCliLoginCodeMutation } from '../api/queries/AuthQueries';

jest.mock('../hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../api/queries/AccountsQueries', () => ({
  useGetOnboardingStatusQuery: jest.fn(),
}));

jest.mock('../api/queries/AuthQueries', () => ({
  useCreateCliLoginCodeMutation: jest.fn(),
}));

jest.mock('../../../shared/components/inputs', () => ({
  CopiableTextarea: ({
    value,
    ...props
  }: {
    value: string;
    [key: string]: unknown;
  }) => <textarea value={value} readOnly {...props} />,
}));

jest.mock('../../organizations/components/dashboard/DashboardKPI', () => ({
  DashboardKPI: () => <div data-testid="dashboard-kpi">Dashboard KPI</div>,
}));

jest.mock(
  '../../organizations/components/dashboard/OutdatedTargetsSection',
  () => ({
    OutdatedTargetsSection: () => (
      <div data-testid="outdated-targets">Outdated Targets</div>
    ),
  }),
);

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('OrganizationHomePage', () => {
  const mockUseAuthContext = useAuthContext as jest.MockedFunction<
    typeof useAuthContext
  >;

  const mockUseGetOnboardingStatusQuery =
    useGetOnboardingStatusQuery as jest.MockedFunction<
      typeof useGetOnboardingStatusQuery
    >;

  const mockUseCreateCliLoginCodeMutation =
    useCreateCliLoginCodeMutation as jest.MockedFunction<
      typeof useCreateCliLoginCodeMutation
    >;

  const defaultMutationResult = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    status: 'idle' as const,
    data: undefined,
    error: null,
    variables: undefined,
    reset: jest.fn(),
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    context: undefined,
    isPaused: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthContext.mockReturnValue({
      organization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        role: 'ADMIN',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseCreateCliLoginCodeMutation.mockReturnValue(
      defaultMutationResult as ReturnType<typeof useCreateCliLoginCodeMutation>,
    );
  });

  describe('Onboarding incomplete', () => {
    it('renders OnboardingSteps when hasDeployed is false', () => {
      mockUseGetOnboardingStatusQuery.mockReturnValue({
        data: {
          hasDeployed: false,
          hasConnectedGitProvider: false,
          hasConnectedGitRepo: false,
          hasCreatedStandard: false,
          hasInvitedColleague: false,
        },
        isLoading: false,
        isError: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<OrganizationHomePage />);

      expect(
        screen.getByText(/Configure your local environment/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Build your playbook/)).toBeInTheDocument();
      expect(screen.getByText(/Vibe code with confidence/)).toBeInTheDocument();
    });

    it('renders OnboardingSteps when hasDeployed is undefined', () => {
      mockUseGetOnboardingStatusQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<OrganizationHomePage />);

      expect(
        screen.getByText(/Configure your local environment/),
      ).toBeInTheDocument();
    });
  });

  describe('Onboarding complete', () => {
    it('renders dashboard when hasDeployed is true', async () => {
      mockUseGetOnboardingStatusQuery.mockReturnValue({
        data: {
          hasDeployed: true,
          hasConnectedGitProvider: true,
          hasConnectedGitRepo: true,
          hasCreatedStandard: true,
          hasInvitedColleague: true,
        },
        isLoading: false,
        isError: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<OrganizationHomePage />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-kpi')).toBeInTheDocument();
        expect(screen.getByTestId('outdated-targets')).toBeInTheDocument();
      });
    });

    it('does not render OnboardingSteps when onboarding is complete', () => {
      mockUseGetOnboardingStatusQuery.mockReturnValue({
        data: {
          hasDeployed: true,
          hasConnectedGitProvider: true,
          hasConnectedGitRepo: true,
          hasCreatedStandard: true,
          hasInvitedColleague: true,
        },
        isLoading: false,
        isError: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<OrganizationHomePage />);

      expect(
        screen.queryByText(/Configure your local environment/),
      ).not.toBeInTheDocument();
    });
  });

  describe('Page title', () => {
    it('renders the welcome title', () => {
      mockUseGetOnboardingStatusQuery.mockReturnValue({
        data: {
          hasDeployed: false,
          hasConnectedGitProvider: false,
          hasConnectedGitRepo: false,
          hasCreatedStandard: false,
          hasInvitedColleague: false,
        },
        isLoading: false,
        isError: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<OrganizationHomePage />);

      expect(
        screen.getByText('👋 Welcome to your dashboard'),
      ).toBeInTheDocument();
    });
  });
});
