import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { OrganizationHomePage } from './OrganizationHomePage';
import { useAuthContext } from '../hooks/useAuthContext';
import { useGetOnboardingStatusQuery } from '../api/queries/AccountsQueries';

jest.mock('../hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../api/queries/AccountsQueries', () => ({
  useGetOnboardingStatusQuery: jest.fn(),
}));

let mockAllStepsComplete = false;
jest.mock('./GetStartedWithPackmindWidget', () => ({
  GetStartedWithPackmindWidget: () =>
    mockAllStepsComplete ? null : (
      <div>
        <h3>Get started with Packmind</h3>
        <p>1. Create your first artifacts</p>
        <p>2. Bundle them into a package</p>
        <p>3. Deploy to your repo</p>
        <p>4. Invite collaborators</p>
      </div>
    ),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockAllStepsComplete = false;

    mockUseAuthContext.mockReturnValue({
      organization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        role: 'ADMIN',
      },
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe('Onboarding incomplete', () => {
    describe('when hasDeployed is false', () => {
      beforeEach(() => {
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
      });

      it('displays GetStartedWithPackmindWidget', () => {
        expect(
          screen.getByRole('heading', { name: /get started with packmind/i }),
        ).toBeInTheDocument();
      });

      it('displays all four onboarding steps', () => {
        expect(
          screen.getByText(/1\. create your first artifacts/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/2\. bundle them into a package/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/3\. deploy to your repo/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/4\. invite collaborators/i),
        ).toBeInTheDocument();
      });
    });

    describe('when hasDeployed is undefined', () => {
      beforeEach(() => {
        mockUseGetOnboardingStatusQuery.mockReturnValue({
          data: undefined,
          isLoading: false,
          isError: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        renderWithProviders(<OrganizationHomePage />);
      });

      it('displays GetStartedWithPackmindWidget', () => {
        expect(
          screen.getByRole('heading', { name: /get started with packmind/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Onboarding complete', () => {
    describe('when all 4 steps are complete', () => {
      beforeEach(() => {
        mockAllStepsComplete = true;
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
      });

      it('displays dashboard KPI section', async () => {
        await waitFor(() => {
          expect(screen.getByTestId('dashboard-kpi')).toBeInTheDocument();
        });
      });

      it('displays outdated targets section', async () => {
        await waitFor(() => {
          expect(screen.getByTestId('outdated-targets')).toBeInTheDocument();
        });
      });

      it('hides GetStartedWithPackmindWidget', () => {
        expect(
          screen.queryByRole('heading', { name: /get started with packmind/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Page title', () => {
    beforeEach(() => {
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
    });

    it('displays welcome title', () => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
