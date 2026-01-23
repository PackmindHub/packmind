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

  describe('when recipe is undeployed', () => {
    beforeEach(() => {
      const recipes = [
        createRecipeDeploymentStatus({
          recipe: recipeFactory({ name: 'Undeployed Recipe' }),
          deployments: [],
          targetDeployments: [], // Ensure both are empty
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(<RecipeCentricView recipes={recipes} />);
    });

    it('displays the recipe name', () => {
      expect(screen.getByText('Undeployed Recipe')).toBeInTheDocument();
    });

    it('displays the not distributed message', () => {
      expect(
        screen.getByText('This recipe has not been distributed yet'),
      ).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    describe('when filtering by search term', () => {
      beforeEach(() => {
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
      });

      it('displays matching recipes', () => {
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
      });

      it('hides non-matching recipes', () => {
        expect(screen.queryByText('Other Recipe')).not.toBeInTheDocument();
      });
    });

    describe('when filtering by outdated status', () => {
      beforeEach(() => {
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
      });

      it('displays outdated recipes', () => {
        expect(screen.getByText('Outdated Recipe')).toBeInTheDocument();
      });

      it('hides up-to-date recipes', () => {
        expect(screen.queryByText('Up-to-date Recipe')).not.toBeInTheDocument();
      });
    });

    describe('when filtering by both search and outdated status', () => {
      beforeEach(() => {
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
      });

      it('displays recipes matching both filters', () => {
        expect(screen.getByText('Test Outdated Recipe')).toBeInTheDocument();
      });

      it('hides up-to-date recipes', () => {
        expect(
          screen.queryByText('Test Up-to-date Recipe'),
        ).not.toBeInTheDocument();
      });

      it('hides recipes not matching search', () => {
        expect(
          screen.queryByText('Other Outdated Recipe'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when filtering by undeployed status', () => {
      beforeEach(() => {
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
      });

      it('hides distributed recipes', () => {
        expect(
          screen.queryByText('Distributed Recipe'),
        ).not.toBeInTheDocument();
      });

      it('displays first undeployed recipe', () => {
        expect(screen.getByText('Undeployed Recipe 1')).toBeInTheDocument();
      });

      it('displays second undeployed recipe', () => {
        expect(screen.getByText('Undeployed Recipe 2')).toBeInTheDocument();
      });
    });

    describe('when filtering by both search and undeployed status', () => {
      beforeEach(() => {
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
      });

      it('hides distributed recipes', () => {
        expect(
          screen.queryByText('Test Distributed Recipe'),
        ).not.toBeInTheDocument();
      });

      it('displays matching undeployed recipes', () => {
        expect(screen.getByText('Test Undeployed Recipe')).toBeInTheDocument();
      });

      it('hides non-matching undeployed recipes', () => {
        expect(
          screen.queryByText('Other Undeployed Recipe'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('empty states', () => {
    describe('when no recipes match search term', () => {
      beforeEach(() => {
        const recipes = [
          createRecipeDeploymentStatus({
            recipe: recipeFactory({ name: 'Test Recipe' }),
          }),
        ];

        renderWithProvider(
          <RecipeCentricView recipes={recipes} searchTerm="nomatch" />,
        );
      });

      it('displays the no recipes found title', () => {
        expect(screen.getByText('No recipes found')).toBeInTheDocument();
      });

      it('displays the search term in message', () => {
        expect(
          screen.getByText('No recipes match your search "nomatch"'),
        ).toBeInTheDocument();
      });
    });

    describe('when no outdated recipes exist', () => {
      beforeEach(() => {
        const recipes = [
          createRecipeDeploymentStatus({
            recipe: recipeFactory({ name: 'Test Recipe' }),
            hasOutdatedDeployments: false,
          }),
        ];

        renderWithProvider(
          <RecipeCentricView recipes={recipes} showOnlyOutdated={true} />,
        );
      });

      it('displays the no outdated recipes title', () => {
        expect(screen.getByText('No outdated recipes')).toBeInTheDocument();
      });

      it('displays the all up-to-date message', () => {
        expect(
          screen.getByText('All recipes have up-to-date deployments'),
        ).toBeInTheDocument();
      });
    });

    describe('when no undeployed recipes exist', () => {
      beforeEach(() => {
        const recipes = [
          createRecipeDeploymentStatus({
            recipe: recipeFactory({ name: 'Test Recipe' }),
            deployments: [createRepositoryDeploymentInfo()],
          }),
        ];

        renderWithProvider(
          <RecipeCentricView recipes={recipes} showOnlyUndeployed={true} />,
        );
      });

      it('displays the no undeployed recipes title', () => {
        expect(screen.getByText('No undeployed recipes')).toBeInTheDocument();
      });

      it('displays the all distributed message', () => {
        expect(
          screen.getByText(
            'All recipes have been distributed to at least one repository',
          ),
        ).toBeInTheDocument();
      });
    });

    describe('when no recipes exist', () => {
      beforeEach(() => {
        renderWithProvider(<RecipeCentricView recipes={[]} />);
      });

      it('displays the no recipes title', () => {
        expect(screen.getByText('No recipes')).toBeInTheDocument();
      });

      it('displays the no recipes in organization message', () => {
        expect(
          screen.getByText('No recipes found in your organization'),
        ).toBeInTheDocument();
      });
    });

    describe('when search term produces no matches with outdated filter', () => {
      beforeEach(() => {
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
      });

      it('displays the no recipes found title', () => {
        expect(screen.getByText('No recipes found')).toBeInTheDocument();
      });

      it('displays the search term in message', () => {
        expect(
          screen.getByText('No recipes match your search "nomatch"'),
        ).toBeInTheDocument();
      });
    });

    describe('when outdated filter is active but undeployed is false', () => {
      beforeEach(() => {
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
      });

      it('displays the no outdated recipes title', () => {
        expect(screen.getByText('No outdated recipes')).toBeInTheDocument();
      });

      it('displays the all up-to-date message', () => {
        expect(
          screen.getByText('All recipes have up-to-date deployments'),
        ).toBeInTheDocument();
      });
    });
  });
});
