import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { StandardCentricView } from './StandardCentricView';
import {
  createStandardDeploymentStatus,
  createRepositoryStandardDeploymentInfo,
} from '@packmind/deployments/test';
import { standardFactory } from '@packmind/standards/test';
import { gitRepoFactory } from '@packmind/git/test/gitRepoFactory';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('StandardCentricView', () => {
  it('displays standard name', () => {
    const standards = [
      createStandardDeploymentStatus({
        standard: standardFactory({ name: 'Test Standard' }),
      }),
    ];

    renderWithProvider(<StandardCentricView standards={standards} />);

    expect(screen.getByText('Test Standard')).toBeInTheDocument();
  });

  it('displays repository names', () => {
    const standards = [
      createStandardDeploymentStatus({
        targetDeployments: [], // Force use of repository-based deployments
        deployments: [
          createRepositoryStandardDeploymentInfo({
            gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
          }),
        ],
      }),
    ];

    renderWithProvider(<StandardCentricView standards={standards} />);

    expect(screen.getByText('test-owner/test-repo:main')).toBeInTheDocument();
  });

  it('displays deployment status badges', () => {
    const standards = [
      createStandardDeploymentStatus({
        targetDeployments: [], // Force use of repository-based deployments
        deployments: [
          createRepositoryStandardDeploymentInfo({
            gitRepo: gitRepoFactory({ owner: 'test-owner', repo: 'test-repo' }),
            isUpToDate: true,
          }),
        ],
      }),
    ];

    renderWithProvider(<StandardCentricView standards={standards} />);

    expect(screen.getByText('Up-to-date')).toBeInTheDocument();
  });

  it('displays undeployed standards with appropriate message', () => {
    const standards = [
      createStandardDeploymentStatus({
        standard: standardFactory({ name: 'Undeployed Standard' }),
        deployments: [],
        targetDeployments: [], // Ensure both are empty
        hasOutdatedDeployments: false,
      }),
    ];

    renderWithProvider(<StandardCentricView standards={standards} />);

    expect(screen.getByText('Undeployed Standard')).toBeInTheDocument();
    expect(
      screen.getByText('This standard has not been distributed yet'),
    ).toBeInTheDocument();
  });

  describe('filtering', () => {
    it('filters standards by search term', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Standard' }),
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Other Standard' }),
        }),
      ];

      renderWithProvider(
        <StandardCentricView standards={standards} searchTerm="test" />,
      );

      expect(screen.getByText('Test Standard')).toBeInTheDocument();
      expect(screen.queryByText('Other Standard')).not.toBeInTheDocument();
    });

    it('shows only outdated standards with active filter', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Outdated Standard' }),
          hasOutdatedDeployments: true,
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Up-to-date Standard' }),
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <StandardCentricView standards={standards} showOnlyOutdated={true} />,
      );

      expect(screen.getByText('Outdated Standard')).toBeInTheDocument();
      expect(screen.queryByText('Up-to-date Standard')).not.toBeInTheDocument();
    });

    it('applies both search and outdated filters together', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Outdated Standard' }),
          hasOutdatedDeployments: true,
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Up-to-date Standard' }),
          hasOutdatedDeployments: false,
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Other Outdated Standard' }),
          hasOutdatedDeployments: true,
        }),
      ];

      renderWithProvider(
        <StandardCentricView
          standards={standards}
          searchTerm="test"
          showOnlyOutdated={true}
        />,
      );

      expect(screen.getByText('Test Outdated Standard')).toBeInTheDocument();
      expect(
        screen.queryByText('Test Up-to-date Standard'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Other Outdated Standard'),
      ).not.toBeInTheDocument();
    });

    it('shows only undeployed standards with active filter', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Distributed Standard' }),
          deployments: [createRepositoryStandardDeploymentInfo()],
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Undeployed Standard 1' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Undeployed Standard 2' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <StandardCentricView standards={standards} showOnlyUndeployed={true} />,
      );

      expect(
        screen.queryByText('Distributed Standard'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Undeployed Standard 1')).toBeInTheDocument();
      expect(screen.getByText('Undeployed Standard 2')).toBeInTheDocument();
    });

    it('applies search and undeployed filters together', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Distributed Standard' }),
          deployments: [createRepositoryStandardDeploymentInfo()],
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Undeployed Standard' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Other Undeployed Standard' }),
          deployments: [],
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <StandardCentricView
          standards={standards}
          searchTerm="test"
          showOnlyUndeployed={true}
        />,
      );

      expect(
        screen.queryByText('Test Distributed Standard'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Test Undeployed Standard')).toBeInTheDocument();
      expect(
        screen.queryByText('Other Undeployed Standard'),
      ).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('displays empty state for no matching standards', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Standard' }),
        }),
      ];

      renderWithProvider(
        <StandardCentricView standards={standards} searchTerm="nomatch" />,
      );

      expect(screen.getByText('No standards found')).toBeInTheDocument();
      expect(
        screen.getByText('No standards match your search "nomatch"'),
      ).toBeInTheDocument();
    });

    it('displays empty state for no outdated standards', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Standard' }),
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(
        <StandardCentricView standards={standards} showOnlyOutdated={true} />,
      );

      expect(screen.getByText('No outdated standards')).toBeInTheDocument();
      expect(
        screen.getByText('All standards have up-to-date deployments'),
      ).toBeInTheDocument();
    });

    it('displays empty state for no undeployed standards', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Standard' }),
          deployments: [createRepositoryStandardDeploymentInfo()],
        }),
      ];

      renderWithProvider(
        <StandardCentricView standards={standards} showOnlyUndeployed={true} />,
      );

      expect(screen.getByText('No undeployed standards')).toBeInTheDocument();
      expect(
        screen.getByText(
          'All standards have been distributed to at least one repository',
        ),
      ).toBeInTheDocument();
    });

    it('displays empty state when no standards exist', () => {
      renderWithProvider(<StandardCentricView standards={[]} />);

      expect(screen.getByText('No standards')).toBeInTheDocument();
      expect(
        screen.getByText('No standards found in your organization'),
      ).toBeInTheDocument();
    });

    it('displays search empty state with priority over filter empty states', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Standard' }),
          hasOutdatedDeployments: false,
          deployments: [createRepositoryStandardDeploymentInfo()],
        }),
      ];

      renderWithProvider(
        <StandardCentricView
          standards={standards}
          searchTerm="nomatch"
          showOnlyOutdated={true}
        />,
      );

      expect(screen.getByText('No standards found')).toBeInTheDocument();
      expect(
        screen.getByText('No standards match your search "nomatch"'),
      ).toBeInTheDocument();
    });

    it('displays outdated empty state with priority over undeployed when both filters are false', () => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Test Standard' }),
          hasOutdatedDeployments: false,
          deployments: [createRepositoryStandardDeploymentInfo()],
        }),
      ];

      renderWithProvider(
        <StandardCentricView
          standards={standards}
          showOnlyOutdated={true}
          showOnlyUndeployed={false}
        />,
      );

      expect(screen.getByText('No outdated standards')).toBeInTheDocument();
      expect(
        screen.getByText('All standards have up-to-date deployments'),
      ).toBeInTheDocument();
    });
  });
});
