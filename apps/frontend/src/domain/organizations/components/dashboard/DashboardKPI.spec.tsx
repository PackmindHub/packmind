import { render, screen } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import { DashboardKPI } from './DashboardKPI';
import * as DeploymentsQueries from '../../../deployments/api/queries/DeploymentsQueries';
import * as SpacesQueries from '../../../spaces/api/queries/SpacesQueries';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router';

jest.mock('../../../deployments/api/queries/DeploymentsQueries');
jest.mock('../../../spaces/api/queries/SpacesQueries');
jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-id-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
  }),
}));
jest.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      slug: 'test-org',
      role: 'ADMIN',
    },
  }),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <UIProvider>
        <DashboardKPI />
      </UIProvider>
    </BrowserRouter>,
  );
};

describe('DashboardKPI', () => {
  const mockKpiData = {
    standards: { total: 2, active: 1 },
    recipes: { total: 2, active: 1 },
    skills: { total: 2, active: 1 },
  };

  beforeEach(() => {
    jest.spyOn(DeploymentsQueries, 'useGetDashboardKpiQuery').mockReturnValue({
      data: mockKpiData,
    } as unknown as ReturnType<
      typeof DeploymentsQueries.useGetDashboardKpiQuery
    >);

    jest
      .spyOn(DeploymentsQueries, 'useGetDashboardNonLiveQuery')
      .mockReturnValue({
        data: { standards: [], recipes: [], skills: [] },
      } as unknown as ReturnType<
        typeof DeploymentsQueries.useGetDashboardNonLiveQuery
      >);

    jest.spyOn(SpacesQueries, 'useGetSpacesQuery').mockReturnValue({
      data: [{ id: 'space-1', name: 'Default Space', slug: 'default-space' }],
    } as unknown as ReturnType<typeof SpacesQueries.useGetSpacesQuery>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section title', () => {
    renderComponent();

    expect(screen.getByText(/Artifacts live/i)).toBeInTheDocument();
  });

  it('displays the standards label', () => {
    renderComponent();

    expect(screen.getByText('Standards')).toBeInTheDocument();
  });

  it('displays standards count', () => {
    renderComponent();

    const stats = screen.getAllByText(/\/ 2 total/);
    expect(stats.length).toBeGreaterThan(0);
  });

  it('displays the commands label', () => {
    renderComponent();

    expect(screen.getByText('Commands')).toBeInTheDocument();
  });

  it('displays commands count', () => {
    renderComponent();

    const stats = screen.getAllByText(/\/ 2 total/);
    expect(stats.length).toBeGreaterThan(0);
  });

  it('displays the skills label', () => {
    renderComponent();

    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('displays skills count', () => {
    renderComponent();

    const stats = screen.getAllByText(/\/ 2 total/);
    expect(stats.length).toBeGreaterThan(0);
  });

  describe('when there are non-live artifacts', () => {
    it('displays a non-live button on each artifact card', () => {
      renderComponent();

      const buttons = screen.getAllByRole('button', {
        name: /1 non-live/i,
      });
      expect(buttons).toHaveLength(3);
    });
  });

  describe('when there are no non-live artifacts', () => {
    beforeEach(() => {
      jest
        .spyOn(DeploymentsQueries, 'useGetDashboardKpiQuery')
        .mockReturnValue({
          data: {
            standards: { total: 1, active: 1 },
            recipes: { total: 1, active: 1 },
            skills: { total: 1, active: 1 },
          },
        } as unknown as ReturnType<
          typeof DeploymentsQueries.useGetDashboardKpiQuery
        >);
    });

    it('does not show any non-live buttons', () => {
      renderComponent();

      const buttons = screen.queryAllByRole('button', {
        name: /non-live/i,
      });
      expect(buttons).toHaveLength(0);
    });
  });
});
