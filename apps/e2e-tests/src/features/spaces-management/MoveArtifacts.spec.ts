import { v4 as uuidv4 } from 'uuid';
import { expect } from '@playwright/test';
import { Standard } from '@packmind/types';
import { testWithApi } from '../../fixtures/packmindTest';
import { apiStandardFactory } from '../../domain/apiDataFactories/apiStandardFactory';
import { apiPackageFactory } from '../../domain/apiDataFactories/apiPackageFactory';

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

    // Verify: packages are now empty
    const packagesPage = await standardsPage.openPackages();

    const frontendPackage = await packagesPage.openPackage('frontend');
    expect(await frontendPackage.isPackageEmpty()).toBe(true);

    const packagesPage2 = await frontendPackage.openPackages();
    const uiPackage = await packagesPage2.openPackage('ui');
    expect(await uiPackage.isPackageEmpty()).toBe(true);
  });
});
