import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MemoryRouter } from 'react-router';
import { RepositoryTargetTable } from './RepositoryTargetTable';
import {
  createDeployedRecipeTargetInfo,
  createDeployedStandardTargetInfo,
  packageFactory,
} from '@packmind/deployments/test';
import { createTargetId } from '@packmind/types';
import { PackageGroup } from '../../utils/groupTargetByPackage';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/org/test-org/space/test-space']}>
      <UIProvider>{ui}</UIProvider>
    </MemoryRouter>,
  );
};

jest.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-id-1',
    spaceSlug: 'test-space',
    spaceName: 'Test Space',
  }),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTable = ({ data }: { data: unknown[] }) => (
    <div data-testid="pm-table" data-row-count={data.length} />
  );
  return { ...actual, PMTable };
});

const target = { id: createTargetId('target-1'), name: 'Production' };

describe('RepositoryTargetTable', () => {
  describe('when packageGroups is provided', () => {
    it('renders one pm-table per package group', () => {
      const recipeA = createDeployedRecipeTargetInfo({ isUpToDate: false });
      const standardB = createDeployedStandardTargetInfo({ isUpToDate: false });

      const groups: PackageGroup[] = [
        {
          pkg: packageFactory({ name: 'alpha', recipes: [recipeA.recipe.id] }),
          recipes: [recipeA],
          standards: [],
          skills: [],
        },
        {
          pkg: packageFactory({
            name: 'beta',
            standards: [standardB.standard.id],
          }),
          recipes: [],
          standards: [standardB],
          skills: [],
        },
      ];

      renderWithProvider(
        <RepositoryTargetTable target={target} packageGroups={groups} />,
      );

      expect(screen.getAllByTestId('pm-table')).toHaveLength(2);
    });

    it('renders both package names in the DOM', () => {
      const recipeA = createDeployedRecipeTargetInfo({ isUpToDate: false });
      const standardB = createDeployedStandardTargetInfo({ isUpToDate: false });

      const groups: PackageGroup[] = [
        {
          pkg: packageFactory({ name: 'alpha', recipes: [recipeA.recipe.id] }),
          recipes: [recipeA],
          standards: [],
          skills: [],
        },
        {
          pkg: packageFactory({
            name: 'beta',
            standards: [standardB.standard.id],
          }),
          recipes: [],
          standards: [standardB],
          skills: [],
        },
      ];

      renderWithProvider(
        <RepositoryTargetTable target={target} packageGroups={groups} />,
      );

      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
    });
  });

  describe('when packageGroups produce no visible rows', () => {
    it('shows the empty state message', () => {
      const upToDateRecipe = createDeployedRecipeTargetInfo({
        isUpToDate: true,
      });
      const upToDateStandard = createDeployedStandardTargetInfo({
        isUpToDate: true,
      });

      const groups: PackageGroup[] = [
        {
          pkg: packageFactory({
            name: 'alpha',
            recipes: [upToDateRecipe.recipe.id],
          }),
          recipes: [upToDateRecipe],
          standards: [],
          skills: [],
        },
        {
          pkg: packageFactory({
            name: 'beta',
            standards: [upToDateStandard.standard.id],
          }),
          recipes: [],
          standards: [upToDateStandard],
          skills: [],
        },
      ];

      renderWithProvider(
        <RepositoryTargetTable
          target={target}
          packageGroups={groups}
          mode="outdated"
        />,
      );

      expect(
        screen.getByText('No artifacts distributed here'),
      ).toBeInTheDocument();
    });

    it('renders zero pm-table elements', () => {
      const upToDateRecipe = createDeployedRecipeTargetInfo({
        isUpToDate: true,
      });

      const groups: PackageGroup[] = [
        {
          pkg: packageFactory({
            name: 'alpha',
            recipes: [upToDateRecipe.recipe.id],
          }),
          recipes: [upToDateRecipe],
          standards: [],
          skills: [],
        },
      ];

      renderWithProvider(
        <RepositoryTargetTable
          target={target}
          packageGroups={groups}
          mode="outdated"
        />,
      );

      expect(screen.queryAllByTestId('pm-table')).toHaveLength(0);
    });
  });

  describe('group ordering', () => {
    it('renders package groups in the order provided', () => {
      const recipeA = createDeployedRecipeTargetInfo({ isUpToDate: false });
      const standardB = createDeployedStandardTargetInfo({ isUpToDate: false });

      const groups: PackageGroup[] = [
        {
          pkg: packageFactory({ name: 'alpha', recipes: [recipeA.recipe.id] }),
          recipes: [recipeA],
          standards: [],
          skills: [],
        },
        {
          pkg: packageFactory({
            name: 'beta',
            standards: [standardB.standard.id],
          }),
          recipes: [],
          standards: [standardB],
          skills: [],
        },
      ];

      renderWithProvider(
        <RepositoryTargetTable target={target} packageGroups={groups} />,
      );

      const renderedNames = screen
        .getAllByText(/alpha|beta/)
        .map((node) => node.textContent);
      expect(renderedNames).toEqual(['alpha', 'beta']);
    });
  });

  describe('when called with no package groups', () => {
    it('shows the empty state', () => {
      renderWithProvider(
        <RepositoryTargetTable target={target} packageGroups={[]} />,
      );

      expect(
        screen.getByText('No artifacts distributed here'),
      ).toBeInTheDocument();
    });
  });
});
