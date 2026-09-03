import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createDistributedPackageId,
  createDistributionId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createTargetId,
  createUserId,
  Distribution,
  DistributionStatus,
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
    },
  ],
  createdAt: '2026-08-01T10:00:00.000Z',
  authorId: createUserId('user-1'),
  organizationId: createOrganizationId('org-1'),
  target: {
    id: createTargetId('target-1'),
    name: 'default',
    path: '/',
    gitRepoId: createGitRepoId('git-repo-1'),
  },
  status: DistributionStatus.success,
  renderModes: [],
  source: 'cli',
};

const renderDialog = (props?: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) =>
  render(
    <UIProvider>
      <RemovePackageFromTargetsDialog
        selectedPackage={selectedPackage}
        distributions={[distribution]}
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

  it('shows the targets the package is distributed to', () => {
    renderDialog();

    expect(screen.getByText('Remove from targets')).toBeInTheDocument();
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
