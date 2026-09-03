import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

import { RemovePackageFromTargetsDialog } from './RemovePackageFromTargetsDialog';
import { useRemovePackageFromTargets } from '../../hooks';

vi.mock('../../hooks', () => ({
  useRemovePackageFromTargets: vi.fn(),
}));

const mockUseRemovePackageFromTargets =
  useRemovePackageFromTargets as MockedFunction<
    typeof useRemovePackageFromTargets
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

const gitRepo = (name: string): GitRepo => ({
  id: createGitRepoId(`git-repo-${name}`),
  owner: 'acme',
  repo: name,
  branch: 'main',
  providerId: createGitProviderId('provider-1'),
  type: 'standard',
  isTracked: true,
  trackingRemovedAt: null,
});

/** One distribution of the package, on one target of one repository. */
const distributionTo = (
  repo: GitRepo,
  target: { id: string; name: string; path: string },
): Distribution => ({
  id: createDistributionId(`dist-${target.id}`),
  distributedPackages: [
    {
      id: createDistributedPackageId(`dp-${target.id}`),
      distributionId: createDistributionId(`dist-${target.id}`),
      packageId,
      recipeVersions: [],
      standardVersions: [],
      skillVersions: [],
      operation: 'add',
    },
  ],
  createdAt: '2026-08-01T10:00:00.000Z',
  authorId: createUserId('user-1'),
  organizationId: createOrganizationId('org-1'),
  target: {
    id: createTargetId(target.id),
    name: target.name,
    path: target.path,
    gitRepoId: repo.id,
    gitRepo: repo,
  },
  status: DistributionStatus.success,
  renderModes: [],
  source: 'cli',
});

const WEBAPP = gitRepo('webapp');
const MONOREPO = gitRepo('monorepo');

const AT_WEBAPP_ROOT = distributionTo(WEBAPP, {
  id: 'target-webapp-root',
  name: 'default',
  path: '/',
});
const AT_MONOREPO_ROOT = distributionTo(MONOREPO, {
  id: 'target-monorepo-root',
  name: 'default',
  path: '/',
});
const AT_MONOREPO_WEB = distributionTo(MONOREPO, {
  id: 'target-monorepo-web',
  name: 'apps/web',
  path: 'apps/web/',
});

const renderDialog = (props?: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  distributions?: Distribution[];
}) =>
  render(
    <UIProvider>
      <RemovePackageFromTargetsDialog
        selectedPackage={selectedPackage}
        distributions={props?.distributions ?? [AT_WEBAPP_ROOT]}
        open={props?.open ?? true}
        onOpenChange={props?.onOpenChange ?? vi.fn()}
      />
    </UIProvider>,
  );

describe('RemovePackageFromTargetsDialog', () => {
  beforeEach(() => {
    mockUseRemovePackageFromTargets.mockReturnValue({
      removePackageFromTargets: vi.fn(),
      isRemoving: false,
    } as unknown as ReturnType<typeof useRemovePackageFromTargets>);
  });

  it('names the destinations it takes the package out of', () => {
    renderDialog();

    expect(screen.getByText('Remove from destinations')).toBeInTheDocument();
  });

  describe('what a row is named after', () => {
    it('names it by its repository', () => {
      renderDialog();

      expect(screen.getByText('acme/webapp')).toBeInTheDocument();
    });

    /*
     * The one place the package lands in that repository, so there is nothing to
     * tell it apart from: the target used to be the row's title, with the row
     * reading `default` under an `acme/webapp` heading and a `Path: /` badge.
     */
    it('leaves the target out when the repository holds one landing', () => {
      renderDialog();

      expect(screen.queryByText('Repository root')).not.toBeInTheDocument();
    });
  });

  describe('when a repository holds two landings', () => {
    const renderTwo = () =>
      renderDialog({
        distributions: [AT_MONOREPO_ROOT, AT_MONOREPO_WEB],
      });

    it('names the root landing', () => {
      renderTwo();

      expect(screen.getByText('Repository root')).toBeInTheDocument();
    });

    it('names the other one', () => {
      renderTwo();

      expect(screen.getByText('apps/web')).toBeInTheDocument();
    });

    it('offers one row per landing', () => {
      renderTwo();

      expect(screen.getAllByText('acme/monorepo')).toHaveLength(2);
    });
  });

  describe('when two repositories hold one landing each', () => {
    it('names neither target', () => {
      renderDialog({ distributions: [AT_WEBAPP_ROOT, AT_MONOREPO_ROOT] });

      expect(screen.queryByText('Repository root')).not.toBeInTheDocument();
    });
  });

  describe('what the confirmation step counts', () => {
    it('counts the pick in distributions', async () => {
      renderDialog();

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /^Remove \(/ }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Are you sure you want to remove "Backend guidelines" from 1 distribution?',
          ),
        ).toBeInTheDocument();
      });
    });
  });

  /*
   * The footer Cancel used to be wrapped in a `PMDialog.CloseTrigger`, which the
   * dialog recipe positions absolutely at the top-right of the content: it left
   * the footer and landed on the header's cross. The part attribute is what
   * carries those styles, so its absence is the thing to hold on to.
   */
  it('keeps the footer cancel out of the close-trigger slot', () => {
    renderDialog();

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const primary = screen.getByRole('button', { name: /^Remove \(/ });

    expect(cancel).not.toHaveAttribute('data-part', 'close-trigger');
    expect(cancel.closest('[data-part="close-trigger"]')).toBeNull();
    expect(cancel.parentElement).toBe(primary.parentElement);
  });

  it('closes the dialog when the footer cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
