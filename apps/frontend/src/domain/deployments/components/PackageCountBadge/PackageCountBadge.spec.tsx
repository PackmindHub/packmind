import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import { PackageCountBadge } from './PackageCountBadge';
import { formatPackageNames } from './PackagesDropdown';
import { createPackageId, createStandardId, Package } from '@packmind/types';
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

const makePackage = (id: string, name: string, description = ''): Package =>
  ({
    id: createPackageId(id),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description,
    spaceId: '' as never,
    createdBy: '' as never,
    recipes: [],
    standards: [],
    skills: [],
  }) as Package;

const twoPackages = [
  makePackage('pkg-1', 'Package Alpha'),
  makePackage('pkg-2', 'Package Beta'),
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

    it('renders formatted package names', () => {
      renderWithProviders(<PackageCountBadge {...defaultProps} />);

      expect(screen.getByTestId('package-count-names')).toHaveTextContent(
        'Package Alpha, Package Beta',
      );
    });

    it('renders a clickable trigger with package names', () => {
      renderWithProviders(<PackageCountBadge {...defaultProps} />);

      const trigger = screen.getByTestId('package-count-names');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
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

describe('formatPackageNames', () => {
  it('returns empty string for empty array', () => {
    expect(formatPackageNames([])).toBe('');
  });

  describe('with names fitting within limit', () => {
    it('returns all names joined by comma', () => {
      const packages = [makePackage('1', 'Alpha'), makePackage('2', 'Beta')];

      expect(formatPackageNames(packages)).toBe('Alpha, Beta');
    });

    it('sorts names alphabetically', () => {
      const packages = [
        makePackage('1', 'Zulu'),
        makePackage('2', 'Alpha'),
        makePackage('3', 'Mike'),
      ];

      expect(formatPackageNames(packages)).toBe('Alpha, Mike, Zulu');
    });
  });

  describe('with names exceeding limit', () => {
    it('appends "and X more" suffix', () => {
      const packages = [
        makePackage('1', 'A very long package name here'),
        makePackage('2', 'Another long package name'),
        makePackage('3', 'Third package'),
      ];

      const result = formatPackageNames(packages, 50);

      expect(result).toMatch(/and \d+ more$/);
    });

    it('includes at least the first name alphabetically', () => {
      const packages = [
        makePackage('1', 'Zzz very long package name that exceeds the limit'),
        makePackage('2', 'Aaa short'),
      ];

      const result = formatPackageNames(packages, 10);

      expect(result).toBe('Aaa short and 1 more');
    });

    it('shows a single long name in full', () => {
      const packages = [
        makePackage(
          '1',
          'This is a very long package name that exceeds sixty characters easily',
        ),
      ];

      const result = formatPackageNames(packages, 10);

      expect(result).toBe(
        'This is a very long package name that exceeds sixty characters easily',
      );
    });
  });
});
