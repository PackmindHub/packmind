import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { OrganizationHomePage } from './OrganizationHomePage';

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
  beforeEach(() => {
    jest.clearAllMocks();
    renderWithProviders(<OrganizationHomePage />);
  });

  it('displays the dashboard KPI section', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-kpi')).toBeInTheDocument();
    });
  });

  it('displays the outdated targets section', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('outdated-targets')).toBeInTheDocument();
    });
  });

  it('displays the dashboard title', () => {
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
