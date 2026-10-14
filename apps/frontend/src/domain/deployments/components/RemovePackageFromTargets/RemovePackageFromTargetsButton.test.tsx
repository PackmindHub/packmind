import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createDistributedPackageId,
  createDistributionId,
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createTargetId,
  createUserId,
  Distribution,
  DistributionStatus,
  GitRepo,
  Package,
} from '@packmind/types';
import type { MockedFunction } from 'vitest';

import { RemovePackageFromTargetsButton } from './RemovePackageFromTargetsButton';
import { useGetTargetsByOrganizationQuery } from '../../api/queries/DeploymentsQueries';

vi.mock('../../hooks', () => ({
  useRemovePackageFromTargets: () => ({
    removePackageFromTargets: vi.fn(),
    isRemoving: false,
  }),
}));

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useGetTargetsByOrganizationQuery: vi.fn(),
}));

const mockUseGetTargets = useGetTargetsByOrganizationQuery as MockedFunction<
  typeof useGetTargetsByOrganizationQuery
>;

const packageId = createPackageId('package-1');

const selectedPackage: Package = {
  id: packageId,
  name: 'Backend guidelines',
  slug: 'backend-guidelines',
  description: '',
  spaceId: createSpaceId('space-1'),
  createdBy: createUserId('user-1'),
  recipes: [],
  standards: [],
  skills: [],
};

const repo: GitRepo = {
  id: createGitRepoId('git-repo-webapp'),
  owner: 'acme',
  repo: 'webapp',
  branch: 'main',
  providerId: createGitProviderId('provider-1'),
  type: 'standard',
  isTracked: true,
  trackingRemovedAt: null,
};

const distribution: Distribution = {
  id: createDistributionId('dist-1'),
  distributedPackages: [
    {
      id: createDistributedPackageId('dp-1'),
      distributionId: createDistributionId('dist-1'),
      packageId,
      recipeVersions: [],
      standardVersions: [],
      skillVersions: [],
      operation: 'add',
      versionSpec: null,
      latestReleaseVersion: null,
    },
  ],
  createdAt: '2026-08-01T10:00:00.000Z',
  authorId: createUserId('user-1'),
  organizationId: createOrganizationId('org-1'),
  target: {
    id: createTargetId('target-webapp-root'),
    name: 'default',
    path: '/',
    gitRepoId: repo.id,
    gitRepo: repo,
  },
  status: DistributionStatus.success,
  renderModes: [],
  source: 'cli',
};

const renderButton = () =>
  render(
    <UIProvider>
      <RemovePackageFromTargetsButton
        selectedPackage={selectedPackage}
        distributions={[distribution]}
      />
    </UIProvider>,
  );

const liveTargets = (targets: unknown[]) =>
  mockUseGetTargets.mockReturnValue({
    data: targets,
  } as unknown as ReturnType<typeof useGetTargetsByOrganizationQuery>);

describe('RemovePackageFromTargetsButton', () => {
  it('is enabled when the package is on a target that still exists', () => {
    liveTargets([{ ...distribution.target, repository: repo }]);
    renderButton();

    expect(
      screen.getByRole('button', { name: 'Remove from destinations' }),
    ).toBeEnabled();
  });

  it('is disabled when the package is only on deleted targets', () => {
    liveTargets([]);
    renderButton();

    expect(
      screen.getByRole('button', { name: 'Remove from destinations' }),
    ).toBeDisabled();
  });
});
