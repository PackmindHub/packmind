import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { RecipeCentricView } from './RecipeCentricView';
import {
  createRecipeDeploymentStatus,
  createRepositoryDeploymentInfo,
} from '@packmind/deployments/test/deploymentOverviewFactory';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('RecipeCentricView', () => {
  it('displays recipe name', () => {
    const recipes = [
      createRecipeDeploymentStatus({
        recipe: recipeFactory({ name: 'Test Recipe' }),
      }),
    ];

    renderWithProvider(<RecipeCentricView recipes={recipes} />);

    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  it('displays repository names', () => {
    const recipes = [
      createRecipeDeploymentStatus({
        targetDeployments: [], // Force use of repository-based deployments
        deployments: [
          createRepositoryDeploymentInfo({
            gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
          }),
        ],
      }),
    ];

    renderWithProvider(<RecipeCentricView recipes={recipes} />);

    expect(screen.getByText('test-owner/test-repo:main')).toBeInTheDocument();
  });

  it('displays deployment status badges', () => {
    const recipes = [
      createRecipeDeploymentStatus({
        targetDeployments: [], // Force use of repository-based deployments
        deployments: [
          createRepositoryDeploymentInfo({
            gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
            isUpToDate: true,
          }),
        ],
      }),
    ];

    renderWithProvider(<RecipeCentricView recipes={recipes} />);

    expect(screen.getByText('Up-to-date')).toBeInTheDocument();
  });

  it('displays undeployed recipes with appropriate message', () => {
    const recipes = [
      createRecipeDeploymentStatus({
        recipe: recipeFactory({ name: 'Undeployed Recipe' }),
        deployments: [],
        targetDeployments: [], // Ensure both are empty
        hasOutdatedDeployments: false,
      }),
    ];

    renderWithProvider(<RecipeCentricView recipes={recipes} />);

    expect(screen.getByText('Undeployed Recipe')).toBeInTheDocument();
    expect(
      screen.getByText('This recipe has not been distributed yet'),
    ).toBeInTheDocument();
  });

  describe('filtering', () => {
    it('filters recipes by search term', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Recipe' }),
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Other Recipe' }),
        }),
      ];

      renderWithProvider(
        <RecipeCentricView recipes={recipes} searchTerm="test" />,
      );

      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
      expect(screen.queryByText('Other Recipe')).not.toBeInTheDocument();
    });

    it('shows only outdated recipes with active filter', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Outdated Recipe' }),
          hasOutdatedDeployments: true,
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Up-to-date Recipe' }),
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <RecipeCentricView recipes={recipes} showOnlyOutdated={true} />,
      );

      expect(screen.getByText('Outdated Recipe')).toBeInTheDocument();
      expect(screen.queryByText('Up-to-date Recipe')).not.toBeInTheDocument();
    });

    it('applies both search and outdated filters together', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Outdated Recipe' }),
          hasOutdatedDeployments: true,
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Up-to-date Recipe' }),
          hasOutdatedDeployments: false,
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Other Outdated Recipe' }),
          hasOutdatedDeployments: true,
        }),
      ];

      renderWithProvider(
        <RecipeCentricView
          recipes={recipes}
          searchTerm="test"
          showOnlyOutdated={true}
        />,
      );

      expect(screen.getByText('Test Outdated Recipe')).toBeInTheDocument();
      expect(
        screen.queryByText('Test Up-to-date Recipe'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Other Outdated Recipe'),
      ).not.toBeInTheDocument();
    });

    it('shows only undeployed recipes with active filter', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Distributed Recipe' }),
          deployments: [createRepositoryDeploymentInfo()],
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Undeployed Recipe 1' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Undeployed Recipe 2' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <RecipeCentricView recipes={recipes} showOnlyUndeployed={true} />,
      );

      expect(screen.queryByText('Distributed Recipe')).not.toBeInTheDocument();
      expect(screen.getByText('Undeployed Recipe 1')).toBeInTheDocument();
      expect(screen.getByText('Undeployed Recipe 2')).toBeInTheDocument();
    });

    it('applies search and undeployed filters together', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Distributed Recipe' }),
          deployments: [createRepositoryDeploymentInfo()],
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Undeployed Recipe' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Other Undeployed Recipe' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <RecipeCentricView
          recipes={recipes}
          searchTerm="test"
          showOnlyUndeployed={true}
        />,
      );

      expect(
        screen.queryByText('Test Distributed Recipe'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Test Undeployed Recipe')).toBeInTheDocument();
      expect(
        screen.queryByText('Other Undeployed Recipe'),
      ).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('displays empty state for no matching recipes', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Recipe' }),
        }),
      ];

      renderWithProvider(
        <RecipeCentricView recipes={recipes} searchTerm="nomatch" />,
      );

      expect(screen.getByText('No recipes found')).toBeInTheDocument();
      expect(
        screen.getByText('No recipes match your search "nomatch"'),
      ).toBeInTheDocument();
    });

    it('displays empty state for no outdated recipes', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Recipe' }),
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <RecipeCentricView recipes={recipes} showOnlyOutdated={true} />,
      );

      expect(screen.getByText('No outdated recipes')).toBeInTheDocument();
      expect(
        screen.getByText('All recipes have up-to-date deployments'),
      ).toBeInTheDocument();
    });

    it('displays empty state for no undeployed recipes', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Recipe' }),
          deployments: [createRepositoryDeploymentInfo()],
        }),
      ];

      renderWithProvider(
        <RecipeCentricView recipes={recipes} showOnlyUndeployed={true} />,
      );

      expect(screen.getByText('No undeployed recipes')).toBeInTheDocument();
      expect(
        screen.getByText(
          'All recipes have been distributed to at least one repository',
        ),
      ).toBeInTheDocument();
    });

    it('displays empty state when no recipes exist', () => {
      renderWithProvider(<RecipeCentricView recipes={[]} />);

      expect(screen.getByText('No recipes')).toBeInTheDocument();
      expect(
        screen.getByText('No recipes found in your organization'),
      ).toBeInTheDocument();
    });

    it('displays search empty state with priority over filter empty states', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Recipe' }),
          hasOutdatedDeployments: false,
          deployments: [createRepositoryDeploymentInfo()],
        }),
      ];

      renderWithProvider(
        <RecipeCentricView
          recipes={recipes}
          searchTerm="nomatch"
          showOnlyOutdated={true}
        />,
      );

      expect(screen.getByText('No recipes found')).toBeInTheDocument();
      expect(
        screen.getByText('No recipes match your search "nomatch"'),
      ).toBeInTheDocument();
    });

    it('displays outdated empty state with priority over undeployed when both filters are false', () => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Test Recipe' }),
          hasOutdatedDeployments: false,
          deployments: [createRepositoryDeploymentInfo()],
        }),
      ];

      renderWithProvider(
        <RecipeCentricView
          recipes={recipes}
          showOnlyOutdated={true}
          showOnlyUndeployed={false}
        />,
      );

      expect(screen.getByText('No outdated recipes')).toBeInTheDocument();
      expect(
        screen.getByText('All recipes have up-to-date deployments'),
      ).toBeInTheDocument();
    });
  });
});
