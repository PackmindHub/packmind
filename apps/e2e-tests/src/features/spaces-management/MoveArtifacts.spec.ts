import { v4 as uuidv4 } from 'uuid';
import { expect } from '@playwright/test';
import { Standard } from '@packmind/types';
import { testWithApi } from '../../fixtures/packmindTest';
import { apiStandardFactory } from '../../domain/apiDataFactories/apiStandardFactory';
import { apiPackageFactory } from '../../domain/apiDataFactories/apiPackageFactory';
import { apiSkillFactory } from '../../domain/apiDataFactories/apiSkillFactory';
import assert from 'node:assert';

const test = testWithApi.extend<{
  userData: { email: string; password: string };
}>({
  // eslint-disable-next-line no-empty-pattern
  userData: ({}, use) => {
    use({
      email: `e2e-${uuidv4()}@packmind.com`,
      password: `${uuidv4()}!!`,
      method: 'password',
    });
  },
});

test.describe('Move artifacts between spaces', () => {
  test('Standards can be moved from one space to another', async ({
    packmindApi,
    dashboardPage,
  }) => {
    // Setup: create 2 standards with unique names via API
    const standard1 = await apiStandardFactory(packmindApi, {
      name: `Standard Alpha ${uuidv4().slice(0, 8)}`,
    });
    const standard2 = await apiStandardFactory(packmindApi, {
      name: `Standard Beta ${uuidv4().slice(0, 8)}`,
    });

    // Create target space via UI (navigates to target space dashboard)
    const targetDashboard = await dashboardPage.createSpace('target');

    // Navigate back to default space
    const defaultDashboard = await targetDashboard.navigateToSpace('Global');

    // Open Standards page and select all
    const standardsPage = await defaultDashboard.openStandards();
    await standardsPage.selectAll();

    // Move all standards to target space
    await standardsPage.moveToSpace('target');

    // Reload to clear TanStack Query cache after move
    await standardsPage.reload();

    // Verify: navigate to target space and check standards are there
    const targetDashboard2 = await standardsPage.navigateToSpace('target');
    const targetStandards = await targetDashboard2.openStandards();
    const standardsList = await targetStandards.listStandards();

    expect(standardsList.map((s) => s.name)).toContain(standard1.name);
    expect(standardsList.map((s) => s.name)).toContain(standard2.name);

    // Verify: navigate back to default space and check it's empty
    const defaultDashboard2 = await targetStandards.navigateToSpace('Global');
    const defaultStandards = await defaultDashboard2.openStandards();

    expect(await defaultStandards.hasNoStandards()).toBe(true);
  });

  test('Moved standards are withdrawn from packages', async ({
    packmindApi,
    dashboardPage,
  }) => {
    // Setup: create standard and packages via API
    const standard: Standard = await apiStandardFactory(packmindApi);
    await apiPackageFactory(packmindApi, {
      name: 'frontend',
      standardIds: [standard.id],
    });
    await apiPackageFactory(packmindApi, {
      name: 'ui',
      standardIds: [standard.id],
    });

    // Create target space via UI
    const targetDashboard = await dashboardPage.createSpace('target');

    // Navigate back to default space
    const defaultDashboard = await targetDashboard.navigateToSpace('Global');

    // Open Standards page, select the standard, and move it
    const standardsPage = await defaultDashboard.openStandards();
    await standardsPage.selectStandardByName(standard.name);
    await standardsPage.moveToSpace('target');

    // Verify: frontend package is now empty
    const packagesPage = await standardsPage.openPackages();
    const frontendPackage = await packagesPage.openPackage('frontend');

    expect(await frontendPackage.isPackageEmpty()).toBe(true);
  });

  test('displays error when moving a skill to a space where same name exists', async ({
    packmindApi,
    dashboardPage,
  }) => {
    // Create backend and frontend spaces via UI
    const backendDashboard = await dashboardPage.createSpace('backend');
    const frontendDashboard = await backendDashboard.createSpace('frontend');

    // Get space IDs via API
    const spaces = await packmindApi.listSpaces();
    const backendSpace = spaces.find((s) => s.name === 'backend');
    const frontendSpace = spaces.find((s) => s.name === 'frontend');

    assert(backendSpace, 'Backend space not found');
    assert(frontendSpace, 'Frontend space not found');

    // Upload skill "commit" in both spaces via API
    await apiSkillFactory(packmindApi, {
      name: 'commit',
      spaceId: backendSpace.id,
    });
    await apiSkillFactory(packmindApi, {
      name: 'commit',
      spaceId: frontendSpace.id,
    });

    // Reload to clear TanStack Query cache after API data creation
    await frontendDashboard.reload();

    // Navigate to backend space, open skills
    const backendDash = await frontendDashboard.navigateToSpace('backend');
    const skillsPage = await backendDash.openSkills();

    // Select the "commit" skill and try to move to frontend
    await skillsPage.selectSkillByName('commit');
    const errorMessage = await skillsPage.moveToSpaceExpectingError('frontend');

    expect(errorMessage).toContain('already exists');
  });
});
