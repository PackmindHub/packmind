import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  type PackageReleaseContent,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { PackageReleaseContents } from './PackageReleaseContents';
import { useGetPackageReleaseQuery } from '../../api/queries/DeploymentsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useGetPackageReleaseQuery: vi.fn(),
}));

const packageId = createPackageId('pkg-1');
const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

const onReadUnreleased = vi.fn();

const release = (
  overrides: Partial<PackageReleaseContent> = {},
): PackageReleaseContent =>
  ({
    id: 'release-1',
    packageId,
    version: '1.1.0',
    name: 'Backend conventions',
    description: '',
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [],
    ...overrides,
  }) as PackageReleaseContent;

const renderContents = ({
  data,
  isLoading = false,
  isError = false,
}: {
  data?: { release: PackageReleaseContent };
  isLoading?: boolean;
  isError?: boolean;
}) => {
  (useGetPackageReleaseQuery as Mock).mockReturnValue({
    data,
    isLoading,
    isError,
  });

  render(
    <UIProvider>
      <PackageReleaseContents
        packageId={packageId}
        spaceId={spaceId}
        organizationId={organizationId}
        version="1.1.0"
        onReadUnreleased={onReadUnreleased}
      />
    </UIProvider>,
  );
};

describe('PackageReleaseContents', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when the release pins components', () => {
    const pinned = release({
      standardVersions: [
        { id: 'sv-1', standardId: 'std-1', name: 'Naming', version: 2 },
      ],
      recipeVersions: [
        { id: 'cv-1', recipeId: 'cmd-1', name: 'Ship it', version: 7 },
      ],
    } as Partial<PackageReleaseContent>);

    it('names each component it pins', () => {
      renderContents({ data: { release: pinned } });

      expect(screen.getByText('Naming')).toBeInTheDocument();
    });

    it('prints the version each one was frozen at', () => {
      renderContents({ data: { release: pinned } });

      expect(screen.getByText('v7')).toBeInTheDocument();
    });

    it('counts what the version holds', () => {
      renderContents({ data: { release: pinned } });

      expect(
        screen.getByText('1.1.0 pins 2 components at the versions below.'),
      ).toBeInTheDocument();
    });

    it('sends nobody to a component as it stands today', () => {
      renderContents({ data: { release: pinned } });

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('hands the reader back to the editable package', async () => {
      renderContents({ data: { release: pinned } });

      await userEvent.click(screen.getByRole('button', { name: 'Unreleased' }));

      expect(onReadUnreleased).toHaveBeenCalled();
    });
  });

  describe('when the release pins nothing', () => {
    it('says so rather than heading empty bands', () => {
      renderContents({ data: { release: release() } });

      expect(screen.getByText('1.1.0 pins no component.')).toBeInTheDocument();
    });
  });

  describe('when the release is still being read', () => {
    it('names the version it is reading', () => {
      renderContents({ isLoading: true });

      expect(screen.getByText('Reading 1.1.0…')).toBeInTheDocument();
    });
  });

  describe('when the release cannot be read', () => {
    it('names the version rather than failing silently', () => {
      renderContents({ isError: true });

      expect(screen.getByText(/1\.1\.0 could not be read/)).toBeInTheDocument();
    });
  });
});
