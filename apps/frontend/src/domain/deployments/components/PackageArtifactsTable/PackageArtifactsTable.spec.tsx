import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { PackageArtifactsTable } from './PackageArtifactsTable';
import {
  createDeployedRecipeTargetInfo,
  createDeployedStandardTargetInfo,
} from '@packmind/deployments/test';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import { DeployedSkillTargetInfo, Skill } from '@packmind/types';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
      <UIProvider>{ui}</UIProvider>
    </MemoryRouter>,
  );
};

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
  const PMTable = ({ data }: { data: unknown[] }) => {
    lastTableRows = data;
    return <div data-testid="pm-table" data-row-count={data.length} />;
  };
  return { ...actual, PMTable };
});

describe('PackageArtifactsTable', () => {
  beforeEach(() => {
    lastTableRows = [];
  });

  it('renders the package name in the header', () => {
    const recipe = createDeployedRecipeTargetInfo();

    renderWithProvider(
      <PackageArtifactsTable
        orgSlug="test-org"
        packageName="my-pkg"
        recipes={[recipe]}
        standards={[]}
        skills={[]}
      />,
    );

    expect(screen.getByText('my-pkg')).toBeInTheDocument();
  });

  it('renders the Package badge label in the header', () => {
    const recipe = createDeployedRecipeTargetInfo();

    renderWithProvider(
      <PackageArtifactsTable
        orgSlug="test-org"
        packageName="my-pkg"
        recipes={[recipe]}
        standards={[]}
        skills={[]}
      />,
    );

    expect(screen.getByText('Package')).toBeInTheDocument();
  });

  it('passes one row per artifact when given a recipe, a standard, and a skill', () => {
    const recipe = createDeployedRecipeTargetInfo();
    const standard = createDeployedStandardTargetInfo();
    const skill = buildDeployedSkillTargetInfo();

    renderWithProvider(
      <PackageArtifactsTable
        orgSlug="test-org"
        packageName="my-pkg"
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
      const outdatedRecipe = createDeployedRecipeTargetInfo({
        isUpToDate: false,
      });
      const upToDateRecipe = createDeployedRecipeTargetInfo({
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
          recipes={[outdatedRecipe, upToDateRecipe]}
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
      const upToDateRecipe = createDeployedRecipeTargetInfo({
        isUpToDate: true,
      });

      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          recipes={[upToDateRecipe]}
          standards={[]}
          skills={[]}
          mode="outdated"
        />,
      );

      expect(screen.queryByTestId('pm-table')).not.toBeInTheDocument();
    });

    it('does not render the Package badge when nothing matches the filter', () => {
      const upToDateRecipe = createDeployedRecipeTargetInfo({
        isUpToDate: true,
      });

      renderWithProvider(
        <PackageArtifactsTable
          orgSlug="test-org"
          packageName="my-pkg"
          recipes={[upToDateRecipe]}
          standards={[]}
          skills={[]}
          mode="outdated"
        />,
      );

      expect(screen.queryByText('Package')).not.toBeInTheDocument();
    });
  });
});
