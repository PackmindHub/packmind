import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PMAccordion, UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../../providers/AuthProvider';
import { PackageArtifactsTable } from './PackageArtifactsTable';
import {
  createDeployedCommandTargetInfo,
  createDeployedStandardTargetInfo,
} from '@packmind/deployments/test';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import {
  createPackageId,
  createCommandId,
  createTargetId,
  DeployedSkillTargetInfo,
  Skill,
} from '@packmind/types';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProvider = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
          <UIProvider>
            <PMAccordion.Root multiple collapsible defaultValue={['pkg-1']}>
              {ui}
            </PMAccordion.Root>
          </UIProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
};

const TEST_PACKAGE_ID = createPackageId('pkg-1');
const TEST_TARGET_ID = createTargetId('target-1');

const buildDeployedSkillTargetInfo = (
  overrides?: Partial<DeployedSkillTargetInfo> & { skill?: Skill },
): DeployedSkillTargetInfo => {
  const skill = overrides?.skill ?? skillFactory();
  const deployedVersion = skillVersionFactory({ skillId: skill.id });
  const latestVersion = skillVersionFactory({
    skillId: skill.id,
    version: deployedVersion.version + 1,
  });
  return {
    skill,
    deployedVersion,
    latestVersion,
    isUpToDate: false,
    deploymentDate: new Date().toISOString(),
    ...overrides,
  };
};

jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-id-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
  }),
}));

let lastTableRows: unknown[] = [];

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTable = ({ data }: { data: Array<Record<string, unknown>> }) => {
    lastTableRows = data;
    return (
      <div data-testid="pm-table" data-row-count={data.length}>
        {data.map((row, idx) => (
          <div key={idx} data-testid="pm-table-row">
            <div data-testid="pm-table-cell-name">
              {row.name as React.ReactNode}
            </div>
            <div data-testid="pm-table-cell-version">
              {row.version as React.ReactNode}
            </div>
            <div data-testid="pm-table-cell-status">
              {row.status as React.ReactNode}
            </div>
          </div>
        ))}
      </div>
    );
  };
  return { ...actual, PMTable };
});

describe('PackageArtifactsTable', () => {
  beforeEach(() => {
    lastTableRows = [];
  });

  it('renders the package name in the header', () => {
    const recipe = createDeployedCommandTargetInfo();

    renderWithProvider(
      <PackageArtifactsTable
        orgSlug="test-org"
        packageName="my-pkg"
        packageId={TEST_PACKAGE_ID}
        targetId={TEST_TARGET_ID}
        canDistributeFromApp={true}
        isDistributeReadinessLoading={false}
        recipes={[recipe]}
        standards={[]}
        skills={[]}
      />,
    );

    expect(screen.getByText('my-pkg')).toBeInTheDocument();
  });

  it('renders the Package badge label in the header', () => {
    const recipe = createDeployedCommandTargetInfo();

    renderWithProvider(
      <PackageArtifactsTable
        orgSlug="test-org"
        packageName="my-pkg"
        packageId={TEST_PACKAGE_ID}
        targetId={TEST_TARGET_ID}
        canDistributeFromApp={true}
        isDistributeReadinessLoading={false}
        recipes={[recipe]}
        standards={[]}
        skills={[]}
      />,
    );

    expect(screen.getByText('Package')).toBeInTheDocument();
  });

  it('passes one row per artifact when given a recipe, a standard, and a skill', () => {
    const recipe = createDeployedCommandTargetInfo();
    const standard = createDeployedStandardTargetInfo();
    const skill = buildDeployedSkillTargetInfo();

    renderWithProvider(
      <PackageArtifactsTable
        orgSlug="test-org"
        packageName="my-pkg"
        packageId={TEST_PACKAGE_ID}
        targetId={TEST_TARGET_ID}
        canDistributeFromApp={true}
        isDistributeReadinessLoading={false}
        recipes={[recipe]}
        standards={[standard]}
        skills={[skill]}
        mode="all"
      />,
    );

    expect(lastTableRows).toHaveLength(3);
  });

  describe('when filtering by outdated mode', () => {
    it('filters out up-to-date artifacts before reaching the table', () => {
      const outdatedCommand = createDeployedCommandTargetInfo({
        isUpToDate: false,
      });
      const upToDateCommand = createDeployedCommandTargetInfo({
        isUpToDate: true,
      });
      const outdatedStandard = createDeployedStandardTargetInfo({
        isUpToDate: false,
      });
      const upToDateStandard = createDeployedStandardTargetInfo({
        isUpToDate: true,
      });

      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[outdatedCommand, upToDateCommand]}
          standards={[outdatedStandard, upToDateStandard]}
          skills={[]}
          mode="outdated"
        />,
      );

      expect(lastTableRows).toHaveLength(2);
    });
  });

  describe('when filtered rows are empty', () => {
    it('returns null instead of rendering the table', () => {
      const upToDateCommand = createDeployedCommandTargetInfo({
        isUpToDate: true,
      });

      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[upToDateCommand]}
          standards={[]}
          skills={[]}
          mode="outdated"
        />,
      );

      expect(screen.queryByTestId('pm-table')).not.toBeInTheDocument();
    });

    it('does not render the Package badge when nothing matches the filter', () => {
      const upToDateCommand = createDeployedCommandTargetInfo({
        isUpToDate: true,
      });

      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[upToDateCommand]}
          standards={[]}
          skills={[]}
          mode="outdated"
        />,
      );

      expect(screen.queryByText('Package')).not.toBeInTheDocument();
    });
  });

  describe('when a pending recipe is provided', () => {
    const pendingCommand = {
      id: createCommandId('pending-recipe-1'),
      name: 'My Pending Recipe',
      slug: 'my-pending-recipe',
    };

    it('renders the pending recipe name in mode all', () => {
      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[]}
          standards={[]}
          skills={[]}
          pendingRecipes={[pendingCommand]}
          mode="all"
        />,
      );

      expect(screen.getByText('My Pending Recipe')).toBeInTheDocument();
    });

    it('renders the Not distributed badge in mode all', () => {
      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[]}
          standards={[]}
          skills={[]}
          pendingRecipes={[pendingCommand]}
          mode="all"
        />,
      );

      expect(screen.getByText('Not distributed')).toBeInTheDocument();
    });

    it('renders the pending recipe name in mode outdated', () => {
      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[]}
          standards={[]}
          skills={[]}
          pendingRecipes={[pendingCommand]}
          mode="outdated"
        />,
      );

      expect(screen.getByText('My Pending Recipe')).toBeInTheDocument();
    });

    it('renders the Not distributed badge in mode outdated', () => {
      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[]}
          standards={[]}
          skills={[]}
          pendingRecipes={[pendingCommand]}
          mode="outdated"
        />,
      );

      expect(screen.getByText('Not distributed')).toBeInTheDocument();
    });

    it('hides the pending recipe in mode up-to-date', () => {
      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          packageId={TEST_PACKAGE_ID}
          targetId={TEST_TARGET_ID}
          canDistributeFromApp={true}
          isDistributeReadinessLoading={false}
          recipes={[]}
          standards={[]}
          skills={[]}
          pendingRecipes={[pendingCommand]}
          mode="up-to-date"
        />,
      );

      expect(screen.queryByText('My Pending Recipe')).not.toBeInTheDocument();
    });
  });
});
