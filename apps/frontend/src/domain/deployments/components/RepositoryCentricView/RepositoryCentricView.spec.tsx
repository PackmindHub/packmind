import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { RepositoryCentricView } from './RepositoryCentricView';
import {
  createRepositoryStandardDeploymentStatus,
  createRepositoryDeploymentStatus,
  createTargetDeploymentStatus,
  createTargetStandardDeploymentStatus,
  createDeployedRecipeInfo,
  targetFactory,
} from '@packmind/deployments/test';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import { RepositoryDeploymentStatus, createTargetId } from '@packmind/types';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
      <UIProvider>{ui}</UIProvider>
    </MemoryRouter>,
  );
};

// Mock useCurrentSpace hook
jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-id-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
  }),
}));

// Mock PMTable to avoid internal UI hook/state issues in tests
jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTable = () => <div data-testid="pm-table" />;
  return { ...actual, PMTable };
});

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

  it('renders a table for a recipe target', () => {
    const target = targetFactory({ id: createTargetId('t1'), name: 'Prod' });
    const recipeTargets = [
      createTargetDeploymentStatus({ target, gitRepo: gitRepoFactory() }),
    ];

    renderWithProvider(
      <RepositoryCentricView
        recipeRepositories={[]}
        recipeTargets={recipeTargets}
      />,
    );

    expect(screen.getAllByTestId('pm-table')).toHaveLength(1);
  });

  it('renders a table for a standard target', () => {
    const target = targetFactory({ id: createTargetId('t2'), name: 'Staging' });
    const standardTargets = [
      createTargetStandardDeploymentStatus({
        target,
        gitRepo: gitRepoFactory(),
      }),
    ];

    renderWithProvider(
      <RepositoryCentricView
        recipeRepositories={[]}
        standardTargets={standardTargets}
      />,
    );

    expect(screen.getAllByTestId('pm-table')).toHaveLength(1);
  });

  it('renders tables for mixed recipe and standard targets in the same repository', () => {
    const sharedRepo = gitRepoFactory({
      owner: 'shared-owner',
      repo: 'shared-repo',
    });
    const t1 = targetFactory({ id: createTargetId('t1'), name: 'Prod' });
    const t2 = targetFactory({ id: createTargetId('t2'), name: 'Staging' });

    const recipeTargets = [
      createTargetDeploymentStatus({ target: t1, gitRepo: sharedRepo }),
    ];
    const standardTargets = [
      createTargetStandardDeploymentStatus({ target: t2, gitRepo: sharedRepo }),
    ];

    renderWithProvider(
      <RepositoryCentricView
        recipeRepositories={[]}
        recipeTargets={recipeTargets}
        standardTargets={standardTargets}
      />,
    );

    expect(
      screen.getByText('shared-owner/shared-repo:main'),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('pm-table').length).toBeGreaterThanOrEqual(1);
  });

  describe('filtering', () => {
    describe('when filtering by search term', () => {
      beforeEach(() => {
        const repositories = [
          createRepositoryDeploymentStatus({
            gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
          }),
          createRepositoryDeploymentStatus({
            gitRepo: gitRepoFactory({
              owner: 'other-owner',
              repo: 'other-repo',
            }),
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={repositories}
            searchTerm="test"
          />,
        );
      });

      it('displays matching repositories', () => {
        expect(
          screen.getByText('test-owner/test-repo:main'),
        ).toBeInTheDocument();
      });

      it('hides non-matching repositories', () => {
        expect(
          screen.queryByText('other-owner/other-repo:main'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when filtering outdated recipes', () => {
      beforeEach(() => {
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
            artifactStatusFilter="outdated"
          />,
        );
      });

      it('displays outdated repositories', () => {
        expect(
          screen.getByText('outdated-owner/outdated-repo:main'),
        ).toBeInTheDocument();
      });

      it('hides up-to-date repositories', () => {
        expect(
          screen.queryByText('uptodate-owner/uptodate-repo:main'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when filtering outdated standards', () => {
      beforeEach(() => {
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
            artifactStatusFilter="outdated"
          />,
        );
      });

      it('displays outdated standard repositories', () => {
        expect(
          screen.getByText(
            'outdated-standards-owner/outdated-standards-repo:main',
          ),
        ).toBeInTheDocument();
      });

      it('hides up-to-date standard repositories', () => {
        expect(
          screen.queryByText(
            'uptodate-standards-owner/uptodate-standards-repo:main',
          ),
        ).not.toBeInTheDocument();
      });
    });

    describe('when filtering outdated with mixed recipes and standards', () => {
      beforeEach(() => {
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
            artifactStatusFilter="outdated"
          />,
        );
      });

      it('displays repositories with outdated recipes', () => {
        expect(
          screen.getByText('outdated-recipes-owner/outdated-recipes-repo:main'),
        ).toBeInTheDocument();
      });

      it('displays repositories with outdated standards', () => {
        expect(
          screen.getByText(
            'outdated-standards-owner/outdated-standards-repo:main',
          ),
        ).toBeInTheDocument();
      });

      it('hides fully up-to-date repositories', () => {
        expect(
          screen.queryByText('uptodate-all-owner/uptodate-all-repo:main'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when applying both search and outdated filters', () => {
      beforeEach(() => {
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
            artifactStatusFilter="outdated"
          />,
        );
      });

      it('displays repositories matching both filters', () => {
        expect(
          screen.getByText('test-owner/outdated-repo:main'),
        ).toBeInTheDocument();
      });

      it('hides up-to-date repositories', () => {
        expect(
          screen.queryByText('test-owner/uptodate-repo:main'),
        ).not.toBeInTheDocument();
      });

      it('hides repositories not matching search term', () => {
        expect(
          screen.queryByText('other-owner/outdated-repo:main'),
        ).not.toBeInTheDocument();
      });
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
            artifactStatusFilter="outdated"
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
            artifactStatusFilter="outdated"
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
    describe('when no repositories match search', () => {
      beforeEach(() => {
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
      });

      it('displays empty state title', () => {
        expect(screen.getByText('No repositories found')).toBeInTheDocument();
      });

      it('displays empty state description', () => {
        expect(
          screen.getByText('No repositories match your search "nomatch"'),
        ).toBeInTheDocument();
      });
    });

    describe('when no outdated targets exist', () => {
      beforeEach(() => {
        const repositories = [
          createRepositoryDeploymentStatus({
            gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
            hasOutdatedRecipes: false,
          }),
        ];

        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={repositories}
            artifactStatusFilter="outdated"
          />,
        );
      });

      it('displays empty state title', () => {
        expect(screen.getByText('No outdated targets')).toBeInTheDocument();
      });

      it('displays empty state description', () => {
        expect(
          screen.getByText(
            'All targets have up-to-date recipes and standards distributed',
          ),
        ).toBeInTheDocument();
      });
    });

    describe('when no distributions have been made yet', () => {
      beforeEach(() => {
        renderWithProvider(
          <RepositoryCentricView
            recipeRepositories={[]}
            standardRepositories={[]}
            recipeTargets={[]}
            standardTargets={[]}
            skillTargets={[]}
          />,
        );
      });

      it('displays deployment blank state heading', () => {
        expect(
          screen.getByText('Ready to distribute your standards'),
        ).toBeInTheDocument();
      });

      it('displays deployment blank state description', () => {
        expect(
          screen.getByText(
            'Distribute recipes, standards, and skills to your repositories. This view will show you the deployment status across all repositories and targets.',
          ),
        ).toBeInTheDocument();
      });

      it('displays preview of what the page will look like', () => {
        expect(
          screen.getByText('DunderMifflin/monorepo:main'),
        ).toBeInTheDocument();
      });
    });

    describe('when no repositories exist', () => {
      beforeEach(() => {
        renderWithProvider(<RepositoryCentricView recipeRepositories={[]} />);
      });

      it('displays deployment blank state heading', () => {
        expect(
          screen.getByText('Ready to distribute your standards'),
        ).toBeInTheDocument();
      });

      it('displays deployment blank state description', () => {
        expect(
          screen.getByText(
            'Distribute recipes, standards, and skills to your repositories. This view will show you the deployment status across all repositories and targets.',
          ),
        ).toBeInTheDocument();
      });
    });

    // legacy empty message removed; in target-only view this case is not rendered
    it('skips legacy empty message (no targets rendered)', () => {
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
          artifactStatusFilter="outdated"
        />,
      );

      expect(screen.getByText('No repositories found')).toBeInTheDocument();
      expect(
        screen.getByText('No repositories match your search "nomatch"'),
      ).toBeInTheDocument();
    });

    it('shows only up-to-date repositories with active filter (legacy data)', () => {
      const repositories = [
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'ok-owner', repo: 'ok-repo' }),
          hasOutdatedRecipes: false,
          deployedRecipes: [createDeployedRecipeInfo({ isUpToDate: true })],
        }),
        createRepositoryDeploymentStatus({
          gitRepo: gitRepoFactory({ owner: 'out-owner', repo: 'out-repo' }),
          hasOutdatedRecipes: true,
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          recipeRepositories={repositories}
          artifactStatusFilter="up-to-date"
        />,
      );

      expect(screen.getByText('ok-owner/ok-repo:main')).toBeInTheDocument();
      expect(
        screen.queryByText('out-owner/out-repo:main'),
      ).not.toBeInTheDocument();
    });
  });
});
