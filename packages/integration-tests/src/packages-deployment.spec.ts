import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  DistributionStatus,
  Package,
  Command,
  Standard,
} from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

describe('Package deployment integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;

  let command1: Command;
  let command2: Command;
  let standard1: Standard;
  let standard2: Standard;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization();
    await dataFactory.withGitRepo();

    command1 = await dataFactory.withCommand({ name: 'Recipe 1' });
    command2 = await dataFactory.withCommand({ name: 'Recipe 2' });

    standard1 = await dataFactory.withStandard({ name: 'Standard 1' });
    standard2 = await dataFactory.withStandard({ name: 'Standard 2' });

    // Mock the git commit to prevent actual git operations during tests
    // With async deployment, the actual commit happens in the background job
    const commit = await createGitCommit();
    const gitAdapter = testApp.gitHexa.getAdapter();
    jest.spyOn(gitAdapter, 'commitToGit').mockResolvedValue(commit);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  async function createGitCommit() {
    const gitCommitRepo = fixture.datasource.getRepository(GitCommitSchema);
    return gitCommitRepo.save(gitCommitFactory());
  }

  describe('Package with recipes and standards', () => {
    let packageWithBoth: Package;

    beforeEach(async () => {
      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Full Package',
          description: 'Package with recipes and standards',
          recipeIds: [command1.id, command2.id],
          standardIds: [standard1.id, standard2.id],
        });
      packageWithBoth = response.package;
    });

    describe('when deploying package', () => {
      let result: Awaited<
        ReturnType<
          ReturnType<
            typeof testApp.deploymentsHexa.getAdapter
          >['publishPackages']
        >
      >;

      beforeEach(async () => {
        result = await testApp.deploymentsHexa.getAdapter().publishPackages({
          ...dataFactory.packmindCommand(),
          packageIds: [packageWithBoth.id],
          targetIds: [dataFactory.target.id],
        });
      });

      it('returns one unified distribution per target', async () => {
        expect(result).toHaveLength(1);
      });

      it('includes target property in distribution', async () => {
        expect(result[0]).toHaveProperty('target');
      });

      it('includes status property in distribution', async () => {
        expect(result[0]).toHaveProperty('status');
      });

      it('sets status to in_progress for async deployment', async () => {
        expect(result[0].status).toBe(DistributionStatus.in_progress);
      });
    });

    describe('when fetching package by ID', () => {
      let fetchedPackage: Package;

      beforeEach(async () => {
        const response = await testApp.deploymentsHexa
          .getAdapter()
          .getPackageById({
            userId: dataFactory.user.id,
            organizationId: dataFactory.organization.id,
            spaceId: dataFactory.space.id,
            packageId: packageWithBoth.id,
          });
        fetchedPackage = response.package;
      });

      it('returns the package', async () => {
        expect(fetchedPackage).toBeDefined();
      });

      it('returns the correct package ID', async () => {
        expect(fetchedPackage.id).toBe(packageWithBoth.id);
      });

      it('includes both recipes', async () => {
        expect(fetchedPackage.recipes).toEqual(
          expect.arrayContaining([command1.id, command2.id]),
        );
      });

      it('includes both standards', async () => {
        expect(fetchedPackage.standards).toEqual(
          expect.arrayContaining([standard1.id, standard2.id]),
        );
      });
    });

    describe('when listing packages by space', () => {
      let pkg: Package;

      beforeEach(async () => {
        const packages = await testApp.deploymentsHexa
          .getAdapter()
          .listPackagesBySpace({
            userId: dataFactory.user.id,
            organizationId: dataFactory.organization.id,
            spaceId: dataFactory.space.id,
          });
        pkg = packages.packages[0];
      });

      it('includes the package recipes', async () => {
        expect(pkg.recipes).toEqual(
          expect.arrayContaining([command1.id, command2.id]),
        );
      });

      it('includes the package standards', async () => {
        expect(pkg.standards).toEqual(
          expect.arrayContaining([standard1.id, standard2.id]),
        );
      });
    });
  });

  describe('Package with only recipes', () => {
    let commandOnlyPackage: Package;
    let result: Awaited<
      ReturnType<
        ReturnType<typeof testApp.deploymentsHexa.getAdapter>['publishPackages']
      >
    >;
    let fetchedPackage: Package;

    beforeEach(async () => {
      const createResponse = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Recipe Only Package',
          description: 'Package with only recipes',
          recipeIds: [command1.id],
          standardIds: [],
        });
      commandOnlyPackage = createResponse.package;

      result = await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...dataFactory.packmindCommand(),
        packageIds: [commandOnlyPackage.id],
        targetIds: [dataFactory.target.id],
      });

      const getResponse = await testApp.deploymentsHexa
        .getAdapter()
        .getPackageById({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          packageId: commandOnlyPackage.id,
        });
      fetchedPackage = getResponse.package;
    });

    it('returns one unified distribution per target', async () => {
      expect(result).toHaveLength(1);
    });

    it('sets status to in_progress for async deployment', async () => {
      expect(result[0].status).toBe(DistributionStatus.in_progress);
    });

    it('contains only recipes in fetched package', async () => {
      expect(fetchedPackage.recipes).toHaveLength(1);
    });

    it('contains no standards in fetched package', async () => {
      expect(fetchedPackage.standards).toHaveLength(0);
    });
  });

  describe('Package with only standards', () => {
    let standardOnlyPackage: Package;
    let result: Awaited<
      ReturnType<
        ReturnType<typeof testApp.deploymentsHexa.getAdapter>['publishPackages']
      >
    >;
    let fetchedPackage: Package;

    beforeEach(async () => {
      const createResponse = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Standard Only Package',
          description: 'Package with only standards',
          recipeIds: [],
          standardIds: [standard1.id],
        });
      standardOnlyPackage = createResponse.package;

      result = await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...dataFactory.packmindCommand(),
        packageIds: [standardOnlyPackage.id],
        targetIds: [dataFactory.target.id],
      });

      const getResponse = await testApp.deploymentsHexa
        .getAdapter()
        .getPackageById({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          packageId: standardOnlyPackage.id,
        });
      fetchedPackage = getResponse.package;
    });

    it('returns one unified distribution per target', async () => {
      expect(result).toHaveLength(1);
    });

    it('sets status to in_progress for async deployment', async () => {
      expect(result[0].status).toBe(DistributionStatus.in_progress);
    });

    it('contains no recipes in fetched package', async () => {
      expect(fetchedPackage.recipes).toHaveLength(0);
    });

    it('contains only standards in fetched package', async () => {
      expect(fetchedPackage.standards).toHaveLength(1);
    });
  });

  describe('Multiple packages deployment', () => {
    let result: Awaited<
      ReturnType<
        ReturnType<typeof testApp.deploymentsHexa.getAdapter>['publishPackages']
      >
    >;

    beforeEach(async () => {
      const response1 = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'First Package',
          description: 'First test package',
          recipeIds: [command1.id],
          standardIds: [standard1.id],
        });

      const response2 = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Second Package',
          description: 'Second test package',
          recipeIds: [command2.id],
          standardIds: [standard2.id],
        });

      const package1 = response1.package;
      const package2 = response2.package;

      result = await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...dataFactory.packmindCommand(),
        packageIds: [package1.id, package2.id],
        targetIds: [dataFactory.target.id],
      });
    });

    it('returns one unified distribution per target', async () => {
      expect(result).toHaveLength(1);
    });

    it('includes target property in distribution', async () => {
      expect(result[0]).toHaveProperty('target');
    });

    it('includes status property in distribution', async () => {
      expect(result[0]).toHaveProperty('status');
    });

    it('sets status to in_progress for async deployment', async () => {
      expect(result[0].status).toBe(DistributionStatus.in_progress);
    });
  });

  describe('when a recipe in a package is deleted', () => {
    let packageWithCommand: Package;
    let afterDeletePackage: Package;

    beforeEach(async () => {
      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package with recipe to delete',
          description: 'Package containing a recipe that will be deleted',
          recipeIds: [command1.id, command2.id],
          standardIds: [standard1.id],
        });
      packageWithCommand = response.package;

      await testApp.commandsHexa.getAdapter().deleteCommand({
        recipeId: command1.id,
        spaceId: dataFactory.space.id,
        userId: dataFactory.user.id,
        organizationId: dataFactory.organization.id,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const afterDelete = await testApp.deploymentsHexa
        .getAdapter()
        .getPackageById({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          packageId: packageWithCommand.id,
        });
      afterDeletePackage = afterDelete.package;
    });

    it('reduces recipe count by one', async () => {
      expect(afterDeletePackage.recipes).toHaveLength(1);
    });

    it('removes the deleted recipe from the package', async () => {
      expect(afterDeletePackage.recipes).not.toContain(command1.id);
    });

    it('retains the non-deleted recipe in the package', async () => {
      expect(afterDeletePackage.recipes).toContain(command2.id);
    });
  });

  describe('when a standard in a package is deleted', () => {
    let packageWithStandard: Package;
    let afterDeletePackage: Package;

    beforeEach(async () => {
      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package with standard to delete',
          description: 'Package containing a standard that will be deleted',
          recipeIds: [command1.id],
          standardIds: [standard1.id, standard2.id],
        });
      packageWithStandard = response.package;

      await testApp.standardsHexa.getAdapter().deleteStandard({
        standardId: standard1.id,
        userId: dataFactory.user.id.toString(),
        organizationId: dataFactory.organization.id.toString(),
        spaceId: dataFactory.space.id,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const afterDelete = await testApp.deploymentsHexa
        .getAdapter()
        .getPackageById({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          packageId: packageWithStandard.id,
        });
      afterDeletePackage = afterDelete.package;
    });

    it('reduces standard count by one', async () => {
      expect(afterDeletePackage.standards).toHaveLength(1);
    });

    it('removes the deleted standard from the package', async () => {
      expect(afterDeletePackage.standards).not.toContain(standard1.id);
    });

    it('retains the non-deleted standard in the package', async () => {
      expect(afterDeletePackage.standards).toContain(standard2.id);
    });
  });

  describe('Standard deployment with rules', () => {
    let result: Awaited<
      ReturnType<
        ReturnType<typeof testApp.deploymentsHexa.getAdapter>['publishPackages']
      >
    >;

    beforeEach(async () => {
      const standardWithRules = await testApp.standardsHexa
        .getAdapter()
        .createStandard({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Standard With Rules',
          description: 'A standard that has rules',
          scope: 'backend',
          rules: [
            { content: 'Always use TypeScript for type safety' },
            { content: 'Write unit tests for all business logic' },
          ],
        });

      const createResponse = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: dataFactory.user.id,
          organizationId: dataFactory.organization.id,
          spaceId: dataFactory.space.id,
          name: 'Package With Rules',
          description: 'Package containing standard with rules',
          recipeIds: [],
          standardIds: [standardWithRules.id],
        });

      const packageWithStandard = createResponse.package;

      result = await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...dataFactory.packmindCommand(),
        packageIds: [packageWithStandard.id],
        targetIds: [dataFactory.target.id],
      });
    });

    it('returns one unified distribution per target', async () => {
      expect(result).toHaveLength(1);
    });

    it('includes target property in distribution', async () => {
      expect(result[0]).toHaveProperty('target');
    });

    it('includes status property in distribution', async () => {
      expect(result[0]).toHaveProperty('status');
    });

    it('sets status to in_progress for async deployment', async () => {
      expect(result[0].status).toBe(DistributionStatus.in_progress);
    });
  });
});
