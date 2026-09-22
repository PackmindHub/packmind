import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createCommandVersionId,
  createCommandId,
  createStandardVersionId,
  createStandardId,
  createSkillVersionId,
  createSkillId,
  createPackageReleaseId,
  type GetPackageReleaseResponse,
  type PackageReleaseSummary,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { PackageReleasesDrawer } from './PackageReleasesDrawer';
import { useGetPackageReleaseQuery } from '../../api/queries/DeploymentsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useGetPackageReleaseQuery: vi.fn(),
}));

const packageId = createPackageId('pkg-1');
const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

/*
 * Annotated rather than inferred, as in PackageVersionArea.spec: the default
 * `getReleaseMock` would otherwise fix the return to `{ data: undefined }` and
 * `releases` to never[]. Frontend specs are type-checked since #500.
 */
const renderComponent = ({
  releases = [],
  open = true,
  getReleaseMock = () => ({ data: undefined, isLoading: false }),
}: {
  releases?: PackageReleaseSummary[];
  open?: boolean;
  getReleaseMock?: (version: string | undefined) => {
    data: GetPackageReleaseResponse | undefined;
    isLoading: boolean;
  };
} = {}) => {
  const onOpenChange = vi.fn();

  (useGetPackageReleaseQuery as Mock).mockImplementation(
    (_orgId, _spId, _pkgId, version: string | undefined) =>
      getReleaseMock(version),
  );

  render(
    <UIProvider>
      <PackageReleasesDrawer
        releases={releases}
        packageId={packageId}
        spaceId={spaceId}
        organizationId={organizationId}
        open={open}
        onOpenChange={onOpenChange}
      />
    </UIProvider>,
  );

  return onOpenChange;
};

describe('PackageReleasesDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists every release, newest first', async () => {
    renderComponent({
      releases: [
        { version: '0.1.0' },
        { version: '0.10.0' },
        { version: '0.9.0' },
      ],
    });

    // The releases should appear in the order: 0.10.0, 0.9.0, 0.1.0
    const buttons = screen.getAllByRole('button', { name: /0\.\d+\.\d+/ });
    expect(buttons[0]).toHaveTextContent('0.10.0');
    expect(buttons[1]).toHaveTextContent('0.9.0');
    expect(buttons[2]).toHaveTextContent('0.1.0');
  });

  it('shows what a selected release pins', async () => {
    const commandVersionId = createCommandVersionId('cmd-v-1');
    const standardVersionId = createStandardVersionId('std-v-1');
    const skillVersionId = createSkillVersionId('skill-v-1');

    const mockRelease: GetPackageReleaseResponse = {
      release: {
        id: createPackageReleaseId('release-1'),
        packageId,
        version: '0.1.0',
        name: 'Test Package',
        description: 'Test Release',
        recipeVersions: [
          {
            id: commandVersionId,
            recipeId: createCommandId('cmd-1'),
            name: 'Build Script',
            version: 2,
          },
        ],
        standardVersions: [
          {
            id: standardVersionId,
            standardId: createStandardId('std-1'),
            name: 'Code Style',
            version: 1,
          },
        ],
        skillVersions: [
          {
            id: skillVersionId,
            skillId: createSkillId('skill-1'),
            name: 'Error Handler',
            version: 3,
          },
        ],
      },
    };

    renderComponent({
      releases: [{ version: '0.1.0' }],
      getReleaseMock: (version) => {
        if (version === '0.1.0') {
          return {
            data: mockRelease,
            isLoading: false,
          };
        }
        return {
          data: undefined,
          isLoading: false,
        };
      },
    });

    // Click on the release version button
    const versionButton = screen.getByRole('button', { name: /0\.1\.0/ });
    await userEvent.click(versionButton);

    // Should show the release details
    expect(screen.getByText('0.1.0')).toBeInTheDocument();
    expect(await screen.findByText('Test Release')).toBeInTheDocument();

    // Should show commands
    expect(screen.getByText('Commands')).toBeInTheDocument();
    expect(screen.getByText('Build Script v2')).toBeInTheDocument();

    // Should show standards
    expect(screen.getByText('Standards')).toBeInTheDocument();
    expect(screen.getByText('Code Style v1')).toBeInTheDocument();

    // Should show skills
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Error Handler v3')).toBeInTheDocument();
  });
});
