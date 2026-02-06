import { render, screen } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import { DashboardKPI } from './DashboardKPI';
import * as DeploymentsQueries from '../../../deployments/api/queries/DeploymentsQueries';
import * as SpacesQueries from '../../../spaces/api/queries/SpacesQueries';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router';

jest.mock('../../../deployments/api/queries/DeploymentsQueries');
jest.mock('../../../spaces/api/queries/SpacesQueries');
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
  const mockRecipesOverview = {
    recipes: [
      {
        recipe: { id: '1', name: 'Recipe 1' },
        targetDeployments: [{ target: 'repo1' }],
      },
      { recipe: { id: '2', name: 'Recipe 2' }, targetDeployments: [] },
    ],
  };

  const mockStandardsOverview = {
    standards: [
      {
        standard: { id: '1', name: 'Standard 1' },
        targetDeployments: [{ target: 'repo1' }],
      },
      { standard: { id: '2', name: 'Standard 2' }, targetDeployments: [] },
    ],
  };

  const mockSkillsOverview = {
    skills: [
      {
        skill: { id: '1', name: 'Skill 1', slug: 'skill-1' },
        targetDeployments: [{ target: 'repo1' }],
      },
      {
        skill: { id: '2', name: 'Skill 2', slug: 'skill-2' },
        targetDeployments: [],
      },
    ],
  };

  beforeEach(() => {
    jest
      .spyOn(DeploymentsQueries, 'useGetRecipesDeploymentOverviewQuery')
      .mockReturnValue({
        data: mockRecipesOverview,
      } as unknown as ReturnType<
        typeof DeploymentsQueries.useGetRecipesDeploymentOverviewQuery
      >);

    jest
      .spyOn(DeploymentsQueries, 'useGetStandardsDeploymentOverviewQuery')
      .mockReturnValue({
        data: mockStandardsOverview,
      } as unknown as ReturnType<
        typeof DeploymentsQueries.useGetStandardsDeploymentOverviewQuery
      >);

    jest
      .spyOn(DeploymentsQueries, 'useGetSkillsDeploymentOverviewQuery')
      .mockReturnValue({
        data: mockSkillsOverview,
      } as unknown as ReturnType<
        typeof DeploymentsQueries.useGetSkillsDeploymentOverviewQuery
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
    it('displays the show non-distributed artifacts button', () => {
      renderComponent();

      const button = screen.getByRole('button', {
        name: /Show non-live artifacts \(3\)/i,
      });
      expect(button).toBeInTheDocument();
    });
  });

  describe('when there are no non-live artifacts', () => {
    beforeEach(() => {
      jest
        .spyOn(DeploymentsQueries, 'useGetRecipesDeploymentOverviewQuery')
        .mockReturnValue({
          data: {
            recipes: [
              {
                recipe: { id: '1', name: 'Recipe 1' },
                targetDeployments: [{ target: 'repo1' }],
              },
            ],
          },
        } as unknown as ReturnType<
          typeof DeploymentsQueries.useGetRecipesDeploymentOverviewQuery
        >);

      jest
        .spyOn(DeploymentsQueries, 'useGetStandardsDeploymentOverviewQuery')
        .mockReturnValue({
          data: {
            standards: [
              {
                standard: { id: '1', name: 'Standard 1' },
                targetDeployments: [{ target: 'repo1' }],
              },
            ],
          },
        } as unknown as ReturnType<
          typeof DeploymentsQueries.useGetStandardsDeploymentOverviewQuery
        >);

      jest
        .spyOn(DeploymentsQueries, 'useGetSkillsDeploymentOverviewQuery')
        .mockReturnValue({
          data: {
            skills: [
              {
                skill: { id: '1', name: 'Skill 1', slug: 'skill-1' },
                targetDeployments: [{ target: 'repo1' }],
              },
            ],
          },
        } as unknown as ReturnType<
          typeof DeploymentsQueries.useGetSkillsDeploymentOverviewQuery
        >);
    });

    it('does not show the non-distributed artifacts button', () => {
      renderComponent();

      const button = screen.queryByRole('button', {
        name: /Show non-distributed artifacts/i,
      });
      expect(button).not.toBeInTheDocument();
    });
  });
});
