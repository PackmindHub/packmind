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

  describe('when standard is undeployed', () => {
    beforeEach(() => {
      const standards = [
        createStandardDeploymentStatus({
          standard: standardFactory({ name: 'Undeployed Standard' }),
          deployments: [],
          targetDeployments: [], // Ensure both are empty
          hasOutdatedDeployments: false,
        }),
      ];

      renderWithProvider(<StandardCentricView standards={standards} />);
    });

    it('displays the standard name', () => {
      expect(screen.getByText('Undeployed Standard')).toBeInTheDocument();
    });

    it('displays the appropriate message', () => {
      expect(
        screen.getByText('This standard has not been distributed yet'),
      ).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    describe('when filtering by search term', () => {
      beforeEach(() => {
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
      });

      it('shows matching standards', () => {
        expect(screen.getByText('Test Standard')).toBeInTheDocument();
      });

      it('hides non-matching standards', () => {
        expect(screen.queryByText('Other Standard')).not.toBeInTheDocument();
      });
    });

    describe('when filtering by outdated status', () => {
      beforeEach(() => {
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
      });

      it('shows outdated standards', () => {
        expect(screen.getByText('Outdated Standard')).toBeInTheDocument();
      });

      it('hides up-to-date standards', () => {
        expect(
          screen.queryByText('Up-to-date Standard'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when applying both search and outdated filters', () => {
      beforeEach(() => {
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
      });

      it('shows standards matching both filters', () => {
        expect(screen.getByText('Test Outdated Standard')).toBeInTheDocument();
      });

      it('hides standards not matching search term', () => {
        expect(
          screen.queryByText('Other Outdated Standard'),
        ).not.toBeInTheDocument();
      });

      it('hides standards not matching outdated filter', () => {
        expect(
          screen.queryByText('Test Up-to-date Standard'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when filtering by undeployed status', () => {
      beforeEach(() => {
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
          <StandardCentricView
            standards={standards}
            showOnlyUndeployed={true}
          />,
        );
      });

      it('hides distributed standards', () => {
        expect(
          screen.queryByText('Distributed Standard'),
        ).not.toBeInTheDocument();
      });

      it('shows first undeployed standard', () => {
        expect(screen.getByText('Undeployed Standard 1')).toBeInTheDocument();
      });

      it('shows second undeployed standard', () => {
        expect(screen.getByText('Undeployed Standard 2')).toBeInTheDocument();
      });
    });

    describe('when applying both search and undeployed filters', () => {
      beforeEach(() => {
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
      });

      it('hides distributed standards even if matching search', () => {
        expect(
          screen.queryByText('Test Distributed Standard'),
        ).not.toBeInTheDocument();
      });

      it('shows undeployed standards matching search', () => {
        expect(
          screen.getByText('Test Undeployed Standard'),
        ).toBeInTheDocument();
      });

      it('hides undeployed standards not matching search', () => {
        expect(
          screen.queryByText('Other Undeployed Standard'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('empty states', () => {
    describe('when no standards match search', () => {
      beforeEach(() => {
        const standards = [
          createStandardDeploymentStatus({
            standard: standardFactory({ name: 'Test Standard' }),
          }),
        ];

        renderWithProvider(
          <StandardCentricView standards={standards} searchTerm="nomatch" />,
        );
      });

      it('displays empty state title', () => {
        expect(screen.getByText('No standards found')).toBeInTheDocument();
      });

      it('displays search-specific message', () => {
        expect(
          screen.getByText('No standards match your search "nomatch"'),
        ).toBeInTheDocument();
      });
    });

    describe('when no outdated standards exist', () => {
      beforeEach(() => {
        const standards = [
          createStandardDeploymentStatus({
            standard: standardFactory({ name: 'Test Standard' }),
            hasOutdatedDeployments: false,
          }),
        ];

        renderWithProvider(
          <StandardCentricView standards={standards} showOnlyOutdated={true} />,
        );
      });

      it('displays empty state title', () => {
        expect(screen.getByText('No outdated standards')).toBeInTheDocument();
      });

      it('displays up-to-date message', () => {
        expect(
          screen.getByText('All standards have up-to-date deployments'),
        ).toBeInTheDocument();
      });
    });

    describe('when no undeployed standards exist', () => {
      beforeEach(() => {
        const standards = [
          createStandardDeploymentStatus({
            standard: standardFactory({ name: 'Test Standard' }),
            deployments: [createRepositoryStandardDeploymentInfo()],
          }),
        ];

        renderWithProvider(
          <StandardCentricView
            standards={standards}
            showOnlyUndeployed={true}
          />,
        );
      });

      it('displays empty state title', () => {
        expect(screen.getByText('No undeployed standards')).toBeInTheDocument();
      });

      it('displays distribution message', () => {
        expect(
          screen.getByText(
            'All standards have been distributed to at least one repository',
          ),
        ).toBeInTheDocument();
      });
    });

    describe('when no standards exist', () => {
      beforeEach(() => {
        renderWithProvider(<StandardCentricView standards={[]} />);
      });

      it('displays empty state title', () => {
        expect(screen.getByText('No standards')).toBeInTheDocument();
      });

      it('displays organization message', () => {
        expect(
          screen.getByText('No standards found in your organization'),
        ).toBeInTheDocument();
      });
    });

    describe('when search empty state has priority over filter empty states', () => {
      beforeEach(() => {
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
      });

      it('displays search empty state title', () => {
        expect(screen.getByText('No standards found')).toBeInTheDocument();
      });

      it('displays search-specific message', () => {
        expect(
          screen.getByText('No standards match your search "nomatch"'),
        ).toBeInTheDocument();
      });
    });

    describe('when outdated empty state has priority over undeployed', () => {
      beforeEach(() => {
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
      });

      it('displays outdated empty state title', () => {
        expect(screen.getByText('No outdated standards')).toBeInTheDocument();
      });

      it('displays up-to-date message', () => {
        expect(
          screen.getByText('All standards have up-to-date deployments'),
        ).toBeInTheDocument();
      });
    });
  });
});
