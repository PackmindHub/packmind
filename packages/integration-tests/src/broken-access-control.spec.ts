import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import { TargetNotFoundError } from '@packmind/deployments';
import {
  GitCommit,
  Package,
  Command,
  SpaceId,
  Standard,
  UserSpaceRole,
} from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';
import { DataQuery } from './helpers/DataQuery';

describe('Broken access control - target ownership validation', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let orgA: DataFactory;
  let orgB: DataFactory;
  let commit: GitCommit;
  let otherSpaceId: SpaceId;

  // Every test in this file starts from the same fixture data, so it is seeded
  // once here and rewound by fixture.cleanup() rather than rebuilt per test.
  beforeAll(async () => {
    await fixture.initialize();

    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    orgA = new DataFactory(testApp);
    await orgA.withUserAndOrganization({ email: 'userA@example.com' });
    await orgA.withGitRepo();

    orgB = new DataFactory(testApp);
    await orgB.withUserAndOrganization({ email: 'userB@example.com' });
    await orgB.withGitRepo();

    commit = await createGitCommit();

    fixture.snapshot();
  });

  // Deployment is asynchronous; stub the commit so no real git work happens.
  // Spies are restored around every test, so it is re-installed per test.
  beforeEach(() => {
    jest
      .spyOn(testApp.gitHexa.getAdapter(), 'commitToGit')
      .mockResolvedValue(commit);
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

  describe('publishPackages', () => {
    let orgAPackage: Package;

    beforeEach(async () => {
      const recipe = await orgA.withCommand({ name: 'Recipe A' });
      const standard = await orgA.withStandard({ name: 'Standard A' });

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
          spaceId: orgA.space.id,
          name: 'Org A Package',
          description: 'Package belonging to org A',
          recipeIds: [recipe.id],
          standardIds: [standard.id],
        });
      orgAPackage = response.package;
    });

    describe("when targeting another organization's target", () => {
      it('throws TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().publishPackages({
            ...orgA.packmindCommand(),
            packageIds: [orgAPackage.id],
            targetIds: [orgB.target.id],
          }),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });

    describe("when targeting own organization's target", () => {
      it('does not throw TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().publishPackages({
            ...orgA.packmindCommand(),
            packageIds: [orgAPackage.id],
            targetIds: [orgA.target.id],
          }),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('publishArtifacts', () => {
    let orgACommand: Command;
    let orgAStandard: Standard;
    let orgAPackage: Package;

    beforeEach(async () => {
      orgACommand = await orgA.withCommand({ name: 'Recipe A' });
      orgAStandard = await orgA.withStandard({ name: 'Standard A' });

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
          spaceId: orgA.space.id,
          name: 'Org A Package',
          description: 'Package belonging to org A',
          recipeIds: [orgACommand.id],
          standardIds: [orgAStandard.id],
        });
      orgAPackage = response.package;
    });

    describe("when targeting another organization's target", () => {
      it('throws TargetNotFoundError', async () => {
        const dataQuery = new DataQuery(testApp);
        const recipeVersionId =
          await dataQuery.getCommandVersionId(orgACommand);
        const standardVersionId =
          await dataQuery.getStandardVersionId(orgAStandard);

        await expect(
          testApp.deploymentsHexa.getAdapter().publishArtifacts({
            ...orgA.packmindCommand(),
            commandVersionIds: [recipeVersionId],
            standardVersionIds: [standardVersionId],
            targetIds: [orgB.target.id],
            packagesSlugs: [orgAPackage.slug],
            packageIds: [orgAPackage.id],
          }),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });

    describe("when targeting own organization's target", () => {
      it('does not throw TargetNotFoundError', async () => {
        const dataQuery = new DataQuery(testApp);
        const recipeVersionId =
          await dataQuery.getCommandVersionId(orgACommand);
        const standardVersionId =
          await dataQuery.getStandardVersionId(orgAStandard);

        await expect(
          testApp.deploymentsHexa.getAdapter().publishArtifacts({
            ...orgA.packmindCommand(),
            commandVersionIds: [recipeVersionId],
            standardVersionIds: [standardVersionId],
            targetIds: [orgA.target.id],
            packagesSlugs: [orgAPackage.slug],
            packageIds: [orgAPackage.id],
          }),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('removePackageFromTargets', () => {
    let orgAPackage: Package;

    beforeEach(async () => {
      const recipe = await orgA.withCommand({ name: 'Recipe A' });
      const standard = await orgA.withStandard({ name: 'Standard A' });

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
          spaceId: orgA.space.id,
          name: 'Org A Package',
          description: 'Package belonging to org A',
          recipeIds: [recipe.id],
          standardIds: [standard.id],
        });
      orgAPackage = response.package;

      await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...orgA.packmindCommand(),
        packageIds: [orgAPackage.id],
        targetIds: [orgA.target.id],
      });
    });

    describe("when targeting another organization's target", () => {
      it('throws TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
            ...orgA.packmindCommand(),
            packageId: orgAPackage.id,
            targetIds: [orgB.target.id],
          }),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });

    describe("when targeting own organization's target", () => {
      it('does not throw TargetNotFoundError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().removePackageFromTargets({
            ...orgA.packmindCommand(),
            packageId: orgAPackage.id,
            targetIds: [orgA.target.id],
          }),
        ).resolves.not.toThrow();
      });
    });
  });
  describe('listDeploymentsByPackage', () => {
    /*
     * The space guard on the use case validates that the caller belongs to the
     * space the command names. On its own that is not enough: nothing stopped a
     * member of one space naming their own space while asking for a package
     * that lives in another one of the organization's spaces, and reading its
     * targets, branches and commits. The package has to be tied to the named
     * space by the query itself, which is what these two tests pin down.
     */
    let otherSpacePackage: Package;

    beforeEach(async () => {
      const otherSpace = await testApp.spacesHexa.getAdapter().createSpace({
        ...orgA.packmindCommand(),
        name: 'Org A Second Space',
      });

      // createSpace does not enrol its creator, and the positive assertion
      // below needs a caller who legitimately belongs to the owning space.
      await testApp.spacesHexa.getAdapter().addSpaceMembership({
        userId: orgA.user.id,
        spaceId: otherSpace.id,
        role: UserSpaceRole.MEMBER,
        createdBy: orgA.user.id,
      });

      const command = await orgA.withCommand({
        name: 'Recipe in the second space',
        spaceId: otherSpace.id,
      });

      const response = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          ...orgA.packmindCommand(),
          spaceId: otherSpace.id,
          name: 'Second Space Package',
          description: 'Package belonging to another space of the same org',
          recipeIds: [command.id],
          standardIds: [],
        });
      otherSpacePackage = response.package;

      // Real history to hide: without a distribution row both assertions below
      // would be empty for the wrong reason, and would pass with the hole open.
      await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...orgA.packmindCommand(),
        packageIds: [otherSpacePackage.id],
        targetIds: [orgA.target.id],
      });

      otherSpaceId = otherSpace.id;
    });

    it('returns the history to the space that owns the package', async () => {
      const history = await testApp.deploymentsHexa
        .getAdapter()
        .listDeploymentsByPackage({
          ...orgA.packmindCommand(),
          organizationId: orgA.organization.id,
          spaceId: otherSpaceId,
          packageId: otherSpacePackage.id,
        });

      expect(history).not.toHaveLength(0);
    });

    it('returns nothing to a space that does not own the package', async () => {
      const history = await testApp.deploymentsHexa
        .getAdapter()
        .listDeploymentsByPackage({
          ...orgA.packmindCommand(),
          organizationId: orgA.organization.id,
          spaceId: orgA.space.id,
          packageId: otherSpacePackage.id,
        });

      expect(history).toEqual([]);
    });
  });
});
