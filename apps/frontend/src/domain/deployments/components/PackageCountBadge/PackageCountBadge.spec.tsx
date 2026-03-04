import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { PackageCountBadge } from './PackageCountBadge';
import { createPackageId, createStandardId } from '@packmind/types';
import * as usePackagesForArtifactModule from '../../hooks/usePackagesForArtifact';

jest.mock('../../hooks/usePackagesForArtifact');

const mockUsePackagesForArtifact = jest.spyOn(
  usePackagesForArtifactModule,
  'usePackagesForArtifact',
);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <UIProvider>{ui}</UIProvider>
    </MemoryRouter>,
  );
};

const defaultProps = {
  artifactId: createStandardId('standard-1'),
  artifactType: 'standard' as const,
  orgSlug: 'my-org',
  spaceSlug: 'my-space',
  spaceId: undefined,
  organizationId: undefined,
};

const twoPackages = [
  {
    id: createPackageId('pkg-1'),
    name: 'Package Alpha',
    slug: 'package-alpha',
    description: '',
    spaceId: '' as never,
    createdBy: '' as never,
    recipes: [],
    standards: [],
    skills: [],
  },
  {
    id: createPackageId('pkg-2'),
    name: 'Package Beta',
    slug: 'package-beta',
    description: '',
    spaceId: '' as never,
    createdBy: '' as never,
    recipes: [],
    standards: [],
    skills: [],
  },
];

describe('PackageCountBadge', () => {
  describe('when no packages contain the artifact', () => {
    beforeEach(() => {
      mockUsePackagesForArtifact.mockReturnValue({
        packages: [],
        count: 0,
        isLoading: false,
      });
    });

    it('renders a dash', () => {
      renderWithProviders(<PackageCountBadge {...defaultProps} />);

      expect(screen.getByTestId('package-count-empty')).toHaveTextContent(
        '\u2014',
      );
    });
  });

  describe('when packages contain the artifact', () => {
    beforeEach(() => {
      mockUsePackagesForArtifact.mockReturnValue({
        packages: twoPackages,
        count: 2,
        isLoading: false,
      });
    });

    it('renders the count badge', () => {
      renderWithProviders(<PackageCountBadge {...defaultProps} />);

      expect(screen.getByTestId('package-count-badge')).toHaveTextContent('2');
    });

    it('renders package links in a popover on click', () => {
      renderWithProviders(<PackageCountBadge {...defaultProps} />);

      screen.getByTestId('package-count-badge').click();

      expect(screen.getByText('Package Alpha').closest('a')).toHaveAttribute(
        'target',
        '_blank',
      );
    });
  });

  describe('when loading', () => {
    beforeEach(() => {
      mockUsePackagesForArtifact.mockReturnValue({
        packages: [],
        count: 0,
        isLoading: true,
      });
    });

    it('renders nothing', () => {
      const { container } = renderWithProviders(
        <PackageCountBadge {...defaultProps} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
