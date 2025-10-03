import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { RepositoryCentricView } from './RepositoryCentricView';
import {
  createRepositoryStandardDeploymentStatus,
  createDeployedStandardInfo,
  createRepositoryDeploymentStatus,
  createDeployedRecipeInfo,
  createTargetDeploymentStatus,
  createTargetStandardDeploymentStatus,
  targetFactory,
} from '@packmind/deployments/test';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { standardFactory } from '@packmind/standards/test';
import { RepositoryDeploymentStatus, createTargetId } from '@packmind/shared';
import { RecipeId } from '@packmind/recipes';
import { StandardId } from '@packmind/standards';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('RepositoryCentricView', () => {
  it('displays repository name', () => {
    const repositories = [
      createRepositoryDeploymentStatus({
        gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView recipeRepositories={repositories} />,
    );

    expect(screen.getByText('test-owner/test-repo:main')).toBeInTheDocument();
  });

  it('displays deployed recipe names with (Recipe) label', () => {
    const repositories = [
      createRepositoryDeploymentStatus({
        deployedRecipes: [
          createDeployedRecipeInfo({
            recipe: recipeFactory({
              id: '1' as RecipeId,
              name: 'Test Recipe 1',
            }),
          }),
        ],
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView recipeRepositories={repositories} />,
    );

    expect(screen.getByTestId('recipe-1')?.textContent?.trim()).toBe(
      'Test Recipe 1Recipe',
    );
  });

  it('displays deployed standard names with (Standard) label', () => {
    const repositories: RepositoryDeploymentStatus[] = [];
    const standardRepositories = [
      createRepositoryStandardDeploymentStatus({
        deployedStandards: [
          createDeployedStandardInfo({
            standard: standardFactory({
              id: '1' as StandardId,
              name: 'Test Standard 1',
            }),
          }),
        ],
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView
        recipeRepositories={repositories}
        standardRepositories={standardRepositories}
      />,
    );

    expect(screen.getByTestId('standard-1')?.textContent?.trim()).toBe(
      'Test Standard 1Standard',
    );
  });

  it('displays both recipes and standards in the same repository', () => {
    const sharedRepo = gitRepoFactory({
      owner: 'shared-owner',
      repo: 'shared-repo',
    });

    const repositories = [
      createRepositoryDeploymentStatus({
        gitRepo: sharedRepo,
        deployedRecipes: [
          createDeployedRecipeInfo({
            recipe: recipeFactory({ name: 'Test Recipe' }),
          }),
        ],
      }),
    ];

    const standardRepositories = [
      createRepositoryStandardDeploymentStatus({
        gitRepo: sharedRepo,
        deployedStandards: [
          createDeployedStandardInfo({
            standard: standardFactory({ name: 'Test Standard' }),
          }),
        ],
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView
        recipeRepositories={repositories}
        standardRepositories={standardRepositories}
      />,
    );

    expect(
      screen.getByText('shared-owner/shared-repo:main'),
    ).toBeInTheDocument();
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('Test Standard')).toBeInTheDocument();
  });

  it('displays deployment status badges for recipes', () => {
    const repositories = [
      createRepositoryDeploymentStatus({
        deployedRecipes: [
          createDeployedRecipeInfo({
            recipe: recipeFactory({ name: 'Test Recipe 1' }),
            isUpToDate: false,
          }),
        ],
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView recipeRepositories={repositories} />,
    );

    expect(screen.getByText('Outdated')).toBeInTheDocument();
  });

  it('displays deployment status badges for standards', () => {
    const repositories: RepositoryDeploymentStatus[] = [];
    const standardRepositories = [
      createRepositoryStandardDeploymentStatus({
        deployedStandards: [
          createDeployedStandardInfo({
            standard: standardFactory({ name: 'Test Standard 1' }),
            isUpToDate: false,
          }),
        ],
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView
        recipeRepositories={repositories}
        standardRepositories={standardRepositories}
      />,
    );

    expect(screen.getByText('Outdated')).toBeInTheDocument();
  });

  it('displays up-to-date status for both recipes and standards', () => {
    const sharedRepo = gitRepoFactory({
      owner: 'test-owner',
      repo: 'test-repo',
    });

    const repositories = [
      createRepositoryDeploymentStatus({
        gitRepo: sharedRepo,
        deployedRecipes: [
          createDeployedRecipeInfo({
            recipe: recipeFactory({ name: 'Up-to-date Recipe' }),
            isUpToDate: true,
          }),
        ],
      }),
    ];

    const standardRepositories = [
      createRepositoryStandardDeploymentStatus({
        gitRepo: sharedRepo,
        deployedStandards: [
          createDeployedStandardInfo({
            standard: standardFactory({ name: 'Up-to-date Standard' }),
            isUpToDate: true,
          }),
        ],
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView
        recipeRepositories={repositories}
        standardRepositories={standardRepositories}
      />,
    );

    expect(screen.getByText('Up-to-date')).toBeInTheDocument();
    expect(screen.getByText('Up-to-date Recipe')).toBeInTheDocument();
    expect(screen.getByText('Up-to-date Standard')).toBeInTheDocument();
  });

  describe('filtering', () => {
    it('filters repositories by search term', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
        }),
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'other-owner', repo: 'other-repo' }),
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          searchTerm="test"
        />,
      );

      expect(screen.getByText('test-owner/test-repo:main')).toBeInTheDocument();
      expect(
        screen.queryByText('other-owner/other-repo:main'),
      ).not.toBeInTheDocument();
    });

    it('shows only outdated repositories with active filter (recipes)', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'outdated-owner',
            repo: 'outdated-repo',
          }),
          hasOutdatedRecipes: true,
        }),
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'uptodate-owner',
            repo: 'uptodate-repo',
          }),
          hasOutdatedRecipes: false,
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          showOnlyOutdated={true}
        />,
      );

      expect(
        screen.getByText('outdated-owner/outdated-repo:main'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('uptodate-owner/uptodate-repo:main'),
      ).not.toBeInTheDocument();
    });

    it('shows only outdated repositories with active filter (standards)', () => {
      const repositories: RepositoryDeploymentStatus[] = [];
      const standardRepositories = [
        createRepositoryStandardDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'outdated-standards-owner',
            repo: 'outdated-standards-repo',
          }),
          hasOutdatedStandards: true,
        }),
        createRepositoryStandardDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'uptodate-standards-owner',
            repo: 'uptodate-standards-repo',
          }),
          hasOutdatedStandards: false,
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          standardRepositories={standardRepositories}
          showOnlyOutdated={true}
        />,
      );

      expect(
        screen.getByText(
          'outdated-standards-owner/outdated-standards-repo:main',
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          'uptodate-standards-owner/uptodate-standards-repo:main',
        ),
      ).not.toBeInTheDocument();
    });

    it('shows repositories with either outdated recipes OR outdated standards', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'outdated-recipes-owner',
            repo: 'outdated-recipes-repo',
          }),
          hasOutdatedRecipes: true,
        }),
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'uptodate-all-owner',
            repo: 'uptodate-all-repo',
          }),
          hasOutdatedRecipes: false,
        }),
      ];

      const standardRepositories = [
        createRepositoryStandardDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'outdated-standards-owner',
            repo: 'outdated-standards-repo',
          }),
          hasOutdatedStandards: true,
        }),
        createRepositoryStandardDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'uptodate-all-owner',
            repo: 'uptodate-all-repo',
          }),
          hasOutdatedStandards: false,
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          standardRepositories={standardRepositories}
          showOnlyOutdated={true}
        />,
      );

      expect(
        screen.getByText('outdated-recipes-owner/outdated-recipes-repo:main'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'outdated-standards-owner/outdated-standards-repo:main',
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('uptodate-all-owner/uptodate-all-repo:main'),
      ).not.toBeInTheDocument();
    });

    it('applies both search and outdated filters together', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'test-owner',
            repo: 'outdated-repo',
          }),
          hasOutdatedRecipes: true,
        }),
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'test-owner',
            repo: 'uptodate-repo',
          }),
          hasOutdatedRecipes: false,
        }),
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({
            owner: 'other-owner',
            repo: 'outdated-repo',
          }),
          hasOutdatedRecipes: true,
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          searchTerm="test"
          showOnlyOutdated={true}
        />,
      );

      expect(
        screen.getByText('test-owner/outdated-repo:main'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('test-owner/uptodate-repo:main'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('other-owner/outdated-repo:main'),
      ).not.toBeInTheDocument();
    });

    describe('target filtering', () => {
      it('filters repositories by selected target IDs using OR logic', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });
        const target2 = targetFactory({
          id: createTargetId('target-2'),
          name: 'Staging',
        });
        const target3 = targetFactory({
          id: createTargetId('target-3'),
          name: 'Development',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({ owner: 'prod-owner', repo: 'prod-repo' }),
          }),
          createTargetDeploymentStatus({
            target: target2,
            gitRepo: gitRepoFactory({
              owner: 'staging-owner',
              repo: 'staging-repo',
            }),
          }),
          createTargetDeploymentStatus({
            target: target3,
            gitRepo: gitRepoFactory({ owner: 'dev-owner', repo: 'dev-repo' }),
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            selectedTargetNames={['Production', 'Staging']}
          />,
        );

        expect(
          screen.getByText('prod-owner/prod-repo:main'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('staging-owner/staging-repo:main'),
        ).toBeInTheDocument();
        expect(
          screen.queryByText('dev-owner/dev-repo:main'),
        ).not.toBeInTheDocument();
      });

      it('filters repositories by selected target IDs for standard targets', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });
        const target2 = targetFactory({
          id: createTargetId('target-2'),
          name: 'Staging',
        });

        const standardTargets = [
          createTargetStandardDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({ owner: 'prod-owner', repo: 'prod-repo' }),
          }),
          createTargetStandardDeploymentStatus({
            target: target2,
            gitRepo: gitRepoFactory({
              owner: 'staging-owner',
              repo: 'staging-repo',
            }),
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            standardTargets={standardTargets}
            selectedTargetNames={['Production']}
          />,
        );

        expect(
          screen.getByText('prod-owner/prod-repo:main'),
        ).toBeInTheDocument();
        expect(
          screen.queryByText('staging-owner/staging-repo:main'),
        ).not.toBeInTheDocument();
      });

      it('combines target filter with search term using AND logic', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
          }),
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({
              owner: 'other-owner',
              repo: 'other-repo',
            }),
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            selectedTargetNames={['Production']}
            searchTerm="test"
          />,
        );

        expect(
          screen.getByText('test-owner/test-repo:main'),
        ).toBeInTheDocument();
        expect(
          screen.queryByText('other-owner/other-repo:main'),
        ).not.toBeInTheDocument();
      });

      it('combines target filter with outdated filter using AND logic', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({
              owner: 'outdated-owner',
              repo: 'outdated-repo',
            }),
            hasOutdatedRecipes: true,
          }),
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({
              owner: 'uptodate-owner',
              repo: 'uptodate-repo',
            }),
            hasOutdatedRecipes: false,
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            selectedTargetNames={['Production']}
            showOnlyOutdated={true}
          />,
        );

        expect(
          screen.getByText('outdated-owner/outdated-repo:main'),
        ).toBeInTheDocument();
        expect(
          screen.queryByText('uptodate-owner/uptodate-repo:main'),
        ).not.toBeInTheDocument();
      });

      it('hides up-to-date targets when filtering by outdated within same repository', () => {
        const sharedRepo = gitRepoFactory({
          owner: 'test-owner',
          repo: 'test-repo',
        });
        const outdatedTarget = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });
        const upToDateTarget = targetFactory({
          id: createTargetId('target-2'),
          name: 'Staging',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: outdatedTarget,
            gitRepo: sharedRepo,
            hasOutdatedRecipes: true,
          }),
          createTargetDeploymentStatus({
            target: upToDateTarget,
            gitRepo: sharedRepo,
            hasOutdatedRecipes: false,
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            showOnlyOutdated={true}
          />,
        );

        expect(
          screen.getByText('test-owner/test-repo:main'),
        ).toBeInTheDocument();
        expect(screen.getByText('Production')).toBeInTheDocument();
        expect(screen.queryByText('Staging')).not.toBeInTheDocument();
      });

      it('shows empty state when no repositories match selected targets', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({ owner: 'prod-owner', repo: 'prod-repo' }),
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            selectedTargetNames={['Staging']}
          />,
        );

        expect(screen.getByText('No repositories found')).toBeInTheDocument();
        expect(
          screen.getByText(
            'No repositories have deployments for the selected targets',
          ),
        ).toBeInTheDocument();
      });

      it('shows combined empty state when no repositories match selected targets and search term', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({ owner: 'prod-owner', repo: 'prod-repo' }),
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            selectedTargetNames={['Production']}
            searchTerm="nomatch"
          />,
        );

        expect(screen.getByText('No repositories found')).toBeInTheDocument();
        expect(
          screen.getByText(
            'No repositories match your search "nomatch" for the selected targets',
          ),
        ).toBeInTheDocument();
      });

      it('does not apply target filter when no targets are selected', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: gitRepoFactory({ owner: 'prod-owner', repo: 'prod-repo' }),
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            selectedTargetNames={[]}
          />,
        );

        expect(
          screen.getByText('prod-owner/prod-repo:main'),
        ).toBeInTheDocument();
      });

      it('handles mixed recipe and standard targets for the same repository', () => {
        const target1 = targetFactory({
          id: createTargetId('target-1'),
          name: 'Production',
        });
        const target2 = targetFactory({
          id: createTargetId('target-2'),
          name: 'Staging',
        });
        const sharedRepo = gitRepoFactory({
          owner: 'shared-owner',
          repo: 'shared-repo',
        });

        const recipeTargets = [
          createTargetDeploymentStatus({
            target: target1,
            gitRepo: sharedRepo,
          }),
        ];

        const standardTargets = [
          createTargetStandardDeploymentStatus({
            target: target2,
            gitRepo: sharedRepo,
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            recipeTargets={recipeTargets}
            standardTargets={standardTargets}
            selectedTargetNames={['Staging']}
          />,
        );

        expect(
          screen.getByText('shared-owner/shared-repo:main'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('empty states', () => {
    it('displays empty state for no matching repositories', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          searchTerm="nomatch"
        />,
      );

      expect(screen.getByText('No repositories found')).toBeInTheDocument();
      expect(
        screen.getByText('No repositories match your search "nomatch"'),
      ).toBeInTheDocument();
    });

    it('displays empty state for no outdated targets', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
          hasOutdatedRecipes: false,
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          showOnlyOutdated={true}
        />,
      );

      expect(screen.getByText('No outdated targets')).toBeInTheDocument();
      expect(
        screen.getByText(
          'All targets have up-to-date recipes and standards deployed',
        ),
      ).toBeInTheDocument();
    });

    it('displays empty state when no repositories exist', () => {
      renderWithProvider(<RepositoryCentricView recipeRepositories={[]} />);

      expect(screen.getByText('No repositories')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No repositories with deployed recipes or standards found',
        ),
      ).toBeInTheDocument();
    });

    it('displays no deployments message for repository with no recipes or standards', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'empty-owner', repo: 'empty-repo' }),
          deployedRecipes: [],
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView recipeRepositories={repositories} />,
      );

      expect(
        screen.getByText('empty-owner/empty-repo:main'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('No recipes or standards deployed here'),
      ).toBeInTheDocument();
    });

    it('displays search empty state with priority over filter empty state', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
          hasOutdatedRecipes: false,
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          searchTerm="nomatch"
          showOnlyOutdated={true}
        />,
      );

      expect(screen.getByText('No repositories found')).toBeInTheDocument();
      expect(
        screen.getByText('No repositories match your search "nomatch"'),
      ).toBeInTheDocument();
    });
  });
});
