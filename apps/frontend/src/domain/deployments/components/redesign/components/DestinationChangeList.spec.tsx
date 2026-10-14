import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  type PackageReleaseContent,
} from '@packmind/types';

import { PinnedDestinationChanges } from './DestinationChangeList';
import { useGetPackageReleaseQuery } from '../../../api/queries/DeploymentsQueries';
import { useAuthContext } from '../../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../../spaces/hooks/useCurrentSpace';

vi.mock('../../../api/queries/DeploymentsQueries', () => ({
  useGetPackageReleaseQuery: vi.fn(),
}));
vi.mock('../../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));
vi.mock('../../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: vi.fn(),
}));

const PACKAGE_ID = createPackageId('pkg-1');

const pinnedStandard = (id: string, name: string, version: number) => ({
  id: createStandardVersionId(`${id}-v${version}`),
  standardId: createStandardId(id),
  name,
  version,
});

const release = (
  version: string,
  standardVersions: ReturnType<typeof pinnedStandard>[],
): PackageReleaseContent =>
  ({
    version,
    standardVersions,
    recipeVersions: [],
    skillVersions: [],
  }) as unknown as PackageReleaseContent;

/** What the two reads answer, keyed by the version each one asked for. */
const releases = (byVersion: Record<string, PackageReleaseContent>) => {
  vi.mocked(useGetPackageReleaseQuery).mockImplementation(((
    _org: unknown,
    _space: unknown,
    _pkg: unknown,
    version: string,
  ) => {
    const found = byVersion[version];
    return {
      data: found ? { release: found } : undefined,
      isLoading: false,
    };
  }) as unknown as typeof useGetPackageReleaseQuery);
};

const renderPinned = () =>
  render(
    <UIProvider>
      <PinnedDestinationChanges
        packageId={PACKAGE_ID}
        fromVersion="0.2.0"
        toVersion="3.0.2"
      />
    </UIProvider>,
  );

describe('PinnedDestinationChanges', () => {
  beforeEach(() => {
    vi.mocked(useAuthContext).mockReturnValue({
      organization: { id: createOrganizationId('org-1') },
    } as unknown as ReturnType<typeof useAuthContext>);
    vi.mocked(useCurrentSpace).mockReturnValue({
      spaceId: createSpaceId('space-1'),
    } as unknown as ReturnType<typeof useCurrentSpace>);
  });

  describe('when both releases have been read', () => {
    beforeEach(() => {
      releases({
        '0.2.0': release('0.2.0', [
          pinnedStandard('std-naming', 'Naming conventions', 1),
          pinnedStandard('std-legacy', 'Session policy', 2),
        ]),
        '3.0.2': release('3.0.2', [
          pinnedStandard('std-naming', 'Naming conventions', 4),
          pinnedStandard('std-testing', 'Testing', 1),
        ]),
      });
      renderPinned();
    });

    it('groups the component the newer release brings under Added', () => {
      expect(screen.getByText('Added · 1')).toBeInTheDocument();
    });

    it('groups the component pinned at a newer revision under Updated', () => {
      expect(screen.getByText('Updated · 1')).toBeInTheDocument();
    });

    it('groups the component the newer release dropped under Removed', () => {
      expect(screen.getByText('Removed · 1')).toBeInTheDocument();
    });

    it('names the component that is arriving', () => {
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });
  });

  describe('while the releases are being read', () => {
    it('says which two it is comparing', () => {
      vi.mocked(useGetPackageReleaseQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useGetPackageReleaseQuery>);
      renderPinned();

      expect(
        screen.getByText(/Comparing 0\.2\.0 with 3\.0\.2/),
      ).toBeInTheDocument();
    });
  });

  describe('when a release could not be read', () => {
    it('still states where the distribution would land', () => {
      releases({ '3.0.2': release('3.0.2', []) });
      renderPinned();

      expect(
        screen.getByText(/still moves this destination to 3\.0\.2/),
      ).toBeInTheDocument();
    });
  });

  describe('when the two releases pin exactly the same revisions', () => {
    it('says the destination already holds the package', () => {
      const same = [pinnedStandard('std-naming', 'Naming conventions', 4)];
      releases({
        '0.2.0': release('0.2.0', same),
        '3.0.2': release('3.0.2', same),
      });
      renderPinned();

      expect(
        screen.getByText(/already holds every component/),
      ).toBeInTheDocument();
    });
  });
});
