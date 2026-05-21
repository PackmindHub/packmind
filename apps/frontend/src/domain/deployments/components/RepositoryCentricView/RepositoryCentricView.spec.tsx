import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../../providers/AuthProvider';
import { RepositoryCentricView } from './RepositoryCentricView';
import {
  createActivePackage,
  createActiveDistributedPackagesByTarget,
  createDeployedRecipeTargetInfo,
  createDeployedStandardTargetInfo,
  packageFactory,
  targetFactory,
} from '@packmind/deployments/test';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';
import { createTargetId } from '@packmind/types';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProvider = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
          <UIProvider>{ui}</UIProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
};

jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-id-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
  }),
}));

jest.mock('../../../git/api/queries/GitProviderQueries', () => ({
  useGetGitProvidersQuery: () => ({
    data: { providers: [] },
    isLoading: false,
  }),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTable = () => <div data-testid="pm-table" />;
  return { ...actual, PMTable };
});

describe('RepositoryCentricView', () => {
  it('displays repository name when a target has an active package', () => {
    const target = targetFactory({ id: createTargetId('t1'), name: 'Prod' });
    const recipeInfo = createDeployedRecipeTargetInfo();
    const pkg = packageFactory({
      name: 'pkg-recipe',
      recipes: [recipeInfo.recipe.id],
    });
    const entries = [
      createActiveDistributedPackagesByTarget({
        target,
        gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
        packages: [
          createActivePackage({ package: pkg, deployedRecipes: [recipeInfo] }),
        ],
      }),
    ];

    renderWithProvider(<RepositoryCentricView entries={entries} />);

    expect(screen.getByText('test-owner/test-repo:main')).toBeInTheDocument();
  });

  it('renders one table per package for a recipe target', () => {
    const target = targetFactory({ id: createTargetId('t1'), name: 'Prod' });
    const recipeInfo = createDeployedRecipeTargetInfo();
    const pkg = packageFactory({
      name: 'pkg-recipe',
      recipes: [recipeInfo.recipe.id],
    });
    const entries = [
      createActiveDistributedPackagesByTarget({
        target,
        gitRepo: gitRepoFactory(),
        packages: [
          createActivePackage({ package: pkg, deployedRecipes: [recipeInfo] }),
        ],
      }),
    ];

    renderWithProvider(<RepositoryCentricView entries={entries} />);

    expect(screen.getAllByTestId('pm-table')).toHaveLength(1);
  });

  it('renders one table per package for a standard target', () => {
    const target = targetFactory({ id: createTargetId('t2'), name: 'Staging' });
    const standardInfo = createDeployedStandardTargetInfo();
    const pkg = packageFactory({
      name: 'pkg-standard',
      standards: [standardInfo.standard.id],
    });
    const entries = [
      createActiveDistributedPackagesByTarget({
        target,
        gitRepo: gitRepoFactory(),
        packages: [
          createActivePackage({
            package: pkg,
            deployedStandards: [standardInfo],
          }),
        ],
      }),
    ];

    renderWithProvider(<RepositoryCentricView entries={entries} />);

    expect(screen.getAllByTestId('pm-table')).toHaveLength(1);
  });

  it('groups recipe and standard targets sharing the same repository under one section', () => {
    const sharedRepo = gitRepoFactory({
      owner: 'shared-owner',
      repo: 'shared-repo',
    });
    const t1 = targetFactory({ id: createTargetId('t1'), name: 'Prod' });
    const t2 = targetFactory({ id: createTargetId('t2'), name: 'Staging' });
    const recipeInfo = createDeployedRecipeTargetInfo();
    const standardInfo = createDeployedStandardTargetInfo();
    const pkg = packageFactory({
      name: 'pkg-mixed',
      recipes: [recipeInfo.recipe.id],
      standards: [standardInfo.standard.id],
    });
    const entries = [
      createActiveDistributedPackagesByTarget({
        target: t1,
        gitRepo: sharedRepo,
        packages: [
          createActivePackage({ package: pkg, deployedRecipes: [recipeInfo] }),
        ],
      }),
      createActiveDistributedPackagesByTarget({
        target: t2,
        gitRepo: sharedRepo,
        packages: [
          createActivePackage({
            package: pkg,
            deployedStandards: [standardInfo],
          }),
        ],
      }),
    ];

    renderWithProvider(<RepositoryCentricView entries={entries} />);

    expect(
      screen.getByText('shared-owner/shared-repo:main'),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('pm-table').length).toBeGreaterThanOrEqual(1);
  });

  describe('filtering', () => {
    it('filters repositories by search term', () => {
      const targetA = targetFactory({ id: createTargetId('tA'), name: 'A' });
      const targetB = targetFactory({ id: createTargetId('tB'), name: 'B' });
      const recipeA = createDeployedRecipeTargetInfo();
      const recipeB = createDeployedRecipeTargetInfo();
      const pkgA = packageFactory({
        name: 'pkg-a',
        recipes: [recipeA.recipe.id],
      });
      const pkgB = packageFactory({
        name: 'pkg-b',
        recipes: [recipeB.recipe.id],
      });
      const entries = [
        createActiveDistributedPackagesByTarget({
          target: targetA,
          gitRepo: gitRepoFactory({
            owner: 'test-owner',
            repo: 'test-repo',
          }),
          packages: [
            createActivePackage({
              package: pkgA,
              deployedRecipes: [recipeA],
            }),
          ],
        }),
        createActiveDistributedPackagesByTarget({
          target: targetB,
          gitRepo: gitRepoFactory({
            owner: 'other-owner',
            repo: 'other-repo',
          }),
          packages: [
            createActivePackage({
              package: pkgB,
              deployedRecipes: [recipeB],
            }),
          ],
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView entries={entries} searchTerm="test" />,
      );

      expect(screen.getByText('test-owner/test-repo:main')).toBeInTheDocument();
      expect(
        screen.queryByText('other-owner/other-repo:main'),
      ).not.toBeInTheDocument();
    });

    it('keeps targets with outdated artifacts when filtering by outdated', () => {
      const outdatedTarget = targetFactory({
        id: createTargetId('outdated'),
        name: 'Outdated',
      });
      const upToDateTarget = targetFactory({
        id: createTargetId('uptodate'),
        name: 'UpToDate',
      });
      const outdatedRecipe = createDeployedRecipeTargetInfo({
        isUpToDate: false,
      });
      const upToDateRecipe = createDeployedRecipeTargetInfo({
        isUpToDate: true,
      });
      const pkgOut = packageFactory({
        name: 'pkg-out',
        recipes: [outdatedRecipe.recipe.id],
      });
      const pkgOk = packageFactory({
        name: 'pkg-ok',
        recipes: [upToDateRecipe.recipe.id],
      });
      const entries = [
        createActiveDistributedPackagesByTarget({
          target: outdatedTarget,
          gitRepo: gitRepoFactory({
            owner: 'outdated-owner',
            repo: 'outdated-repo',
          }),
          packages: [
            createActivePackage({
              package: pkgOut,
              deployedRecipes: [outdatedRecipe],
            }),
          ],
        }),
        createActiveDistributedPackagesByTarget({
          target: upToDateTarget,
          gitRepo: gitRepoFactory({
            owner: 'uptodate-owner',
            repo: 'uptodate-repo',
          }),
          packages: [
            createActivePackage({
              package: pkgOk,
              deployedRecipes: [upToDateRecipe],
            }),
          ],
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          entries={entries}
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

    it('filters targets by selected target names', () => {
      const prodTarget = targetFactory({
        id: createTargetId('prod'),
        name: 'Production',
      });
      const stagingTarget = targetFactory({
        id: createTargetId('staging'),
        name: 'Staging',
      });
      const sharedRepo = gitRepoFactory({
        owner: 'shared-owner',
        repo: 'shared-repo',
      });
      const recipeProd = createDeployedRecipeTargetInfo({ isUpToDate: false });
      const recipeStaging = createDeployedRecipeTargetInfo({
        isUpToDate: false,
      });
      const pkg = packageFactory({
        name: 'pkg',
        recipes: [recipeProd.recipe.id, recipeStaging.recipe.id],
      });
      const entries = [
        createActiveDistributedPackagesByTarget({
          target: prodTarget,
          gitRepo: sharedRepo,
          packages: [
            createActivePackage({
              package: pkg,
              deployedRecipes: [recipeProd],
            }),
          ],
        }),
        createActiveDistributedPackagesByTarget({
          target: stagingTarget,
          gitRepo: sharedRepo,
          packages: [
            createActivePackage({
              package: pkg,
              deployedRecipes: [recipeStaging],
            }),
          ],
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          entries={entries}
          selectedTargetNames={['Production']}
        />,
      );

      expect(screen.getByText('Production')).toBeInTheDocument();
      expect(screen.queryByText('Staging')).not.toBeInTheDocument();
    });

    it('filters repositories by selected repository ids', () => {
      const targetA = targetFactory({ id: createTargetId('tA'), name: 'A' });
      const targetB = targetFactory({ id: createTargetId('tB'), name: 'B' });
      const recipeA = createDeployedRecipeTargetInfo();
      const recipeB = createDeployedRecipeTargetInfo();
      const repoA = gitRepoFactory({ owner: 'a-owner', repo: 'a-repo' });
      const repoB = gitRepoFactory({ owner: 'b-owner', repo: 'b-repo' });
      const pkg = packageFactory({
        name: 'pkg',
        recipes: [recipeA.recipe.id, recipeB.recipe.id],
      });
      const entries = [
        createActiveDistributedPackagesByTarget({
          target: targetA,
          gitRepo: repoA,
          packages: [
            createActivePackage({
              package: pkg,
              deployedRecipes: [recipeA],
            }),
          ],
        }),
        createActiveDistributedPackagesByTarget({
          target: targetB,
          gitRepo: repoB,
          packages: [
            createActivePackage({
              package: pkg,
              deployedRecipes: [recipeB],
            }),
          ],
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          entries={entries}
          selectedRepoIds={[repoA.id]}
        />,
      );

      expect(screen.getByText('a-owner/a-repo:main')).toBeInTheDocument();
      expect(screen.queryByText('b-owner/b-repo:main')).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('shows the no-distributions empty state when there are no entries', () => {
      renderWithProvider(<RepositoryCentricView entries={[]} />);

      expect(screen.getByText('No distributions yet')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No recipes, standards, or skills have been distributed to repositories yet',
        ),
      ).toBeInTheDocument();
    });

    it('shows the search empty state when search yields no result', () => {
      const target = targetFactory({ id: createTargetId('t'), name: 'T' });
      const recipe = createDeployedRecipeTargetInfo();
      const pkg = packageFactory({
        name: 'pkg',
        recipes: [recipe.recipe.id],
      });
      const entries = [
        createActiveDistributedPackagesByTarget({
          target,
          gitRepo: gitRepoFactory({
            owner: 'test-owner',
            repo: 'test-repo',
          }),
          packages: [
            createActivePackage({ package: pkg, deployedRecipes: [recipe] }),
          ],
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView entries={entries} searchTerm="nomatch" />,
      );

      expect(screen.getByText('No repositories found')).toBeInTheDocument();
      expect(
        screen.getByText('No repositories match your search "nomatch"'),
      ).toBeInTheDocument();
    });

    it('shows the no-outdated-targets empty state when filtering outdated', () => {
      const target = targetFactory({ id: createTargetId('t'), name: 'T' });
      const recipe = createDeployedRecipeTargetInfo({ isUpToDate: true });
      const pkg = packageFactory({
        name: 'pkg',
        recipes: [recipe.recipe.id],
      });
      const entries = [
        createActiveDistributedPackagesByTarget({
          target,
          gitRepo: gitRepoFactory({
            owner: 'test-owner',
            repo: 'test-repo',
          }),
          packages: [
            createActivePackage({ package: pkg, deployedRecipes: [recipe] }),
          ],
        }),
      ];

      renderWithProvider(
        <RepositoryCentricView
          entries={entries}
          artifactStatusFilter="outdated"
        />,
      );

      expect(screen.getByText('No outdated targets')).toBeInTheDocument();
    });
  });

  describe('per-package rendering', () => {
    it('renders one sub-table per active package and shows each package name', () => {
      const target = targetFactory({
        id: createTargetId('target-pkg'),
        name: 'Prod',
      });
      const sharedRepo = gitRepoFactory({
        owner: 'pkg-owner',
        repo: 'pkg-repo',
      });
      const recipeInfo = createDeployedRecipeTargetInfo();
      const standardInfo = createDeployedStandardTargetInfo();
      const alpha = packageFactory({
        name: 'alpha',
        standards: [standardInfo.standard.id],
      });
      const beta = packageFactory({
        name: 'beta',
        recipes: [recipeInfo.recipe.id],
      });
      const entries = [
        createActiveDistributedPackagesByTarget({
          target,
          gitRepo: sharedRepo,
          packages: [
            createActivePackage({
              package: alpha,
              deployedStandards: [standardInfo],
            }),
            createActivePackage({
              package: beta,
              deployedRecipes: [recipeInfo],
            }),
          ],
        }),
      ];

      renderWithProvider(<RepositoryCentricView entries={entries} />);

      expect(screen.getAllByTestId('pm-table')).toHaveLength(2);
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
    });
  });
});
