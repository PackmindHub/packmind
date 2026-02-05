import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { DistributeStep } from './DistributeStep';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('DistributeStep', () => {
  describe('renders content', () => {
    it('displays the title and description', () => {
      renderWithProviders(<DistributeStep />);

      expect(screen.getByText('Distribute packages')).toBeInTheDocument();
      expect(
        screen.getByText('Install packages in your repository using the CLI.'),
      ).toBeInTheDocument();
    });

    it('displays loading state when isLoading is true', () => {
      renderWithProviders(<DistributeStep isLoading={true} />);

      expect(screen.getByText('Loading packages...')).toBeInTheDocument();
    });

    it('displays no packages message when packages array is empty', () => {
      renderWithProviders(<DistributeStep packages={[]} />);

      expect(
        screen.getByText(
          'No packages available. Create a package first to deploy it.',
        ),
      ).toBeInTheDocument();
    });

    describe('when packages are provided', () => {
      it('displays available packages header', () => {
        const packages = [
          { id: '1', name: 'Package 1', slug: 'package-1' },
          { id: '2', name: 'Package 2', slug: 'package-2' },
        ];

        renderWithProviders(<DistributeStep packages={packages} />);

        expect(screen.getByText('Available packages')).toBeInTheDocument();
      });

      it('displays first package', () => {
        const packages = [
          { id: '1', name: 'Package 1', slug: 'package-1' },
          { id: '2', name: 'Package 2', slug: 'package-2' },
        ];

        renderWithProviders(<DistributeStep packages={packages} />);

        expect(screen.getByText('Package 1')).toBeInTheDocument();
      });

      it('displays second package', () => {
        const packages = [
          { id: '1', name: 'Package 1', slug: 'package-1' },
          { id: '2', name: 'Package 2', slug: 'package-2' },
        ];

        renderWithProviders(<DistributeStep packages={packages} />);

        expect(screen.getByText('Package 2')).toBeInTheDocument();
      });
    });

    it('displays install command for each package', () => {
      const packages = [
        { id: '1', name: 'Package 1', slug: 'package-1' },
        { id: '2', name: 'Package 2', slug: 'package-2' },
      ];

      renderWithProviders(<DistributeStep packages={packages} />);

      const input1 = screen.getByDisplayValue('packmind-cli install package-1');
      const input2 = screen.getByDisplayValue('packmind-cli install package-2');

      expect(input1).toBeInTheDocument();
      expect(input2).toBeInTheDocument();
    });
  });
});
