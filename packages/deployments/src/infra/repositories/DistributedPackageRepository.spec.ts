import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createDistributedPackageId,
  createDistributionId,
  createOrganizationId,
  createUserId,
  DistributionStatus,
  Package,
} from '@packmind/types';
import {
  GitCommitSchema,
  GitRepoSchema,
  GitProviderSchema,
  OrganizationGitHubAppSchema,
} from '@packmind/git';
import { OrganizationSchema } from '@packmind/accounts';
import { SpaceSchema } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { commandsSchemas } from '@packmind/commands';
import { skillsSchemas } from '@packmind/skills';

import { DistributedPackageRepository } from './DistributedPackageRepository';
import { DistributedPackageSchema } from '../schemas/DistributedPackageSchema';
import { DistributionSchema } from '../schemas/DistributionSchema';
import { PackageSchema } from '../schemas/PackageSchema';
import { TargetSchema } from '../schemas/TargetSchema';
import { gitProviderFactory, gitRepoFactory } from '@packmind/git/test';
import { packageFactory } from '../../../test';
import { targetFactory } from '../../../test/targetFactory';

/**
 * The version spec is the one column on this table whose value the drift read
 * depends on, and a use-case test asserting the repository was *called* with it
 * says nothing about whether the schema maps it to a column. This is that
 * round trip.
 */
describe('DistributedPackageRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    OrganizationGitHubAppSchema,
    GitProviderSchema,
    GitRepoSchema,
    GitCommitSchema,
    SpaceSchema,
    ...standardsSchemas,
    ...commandsSchemas,
    ...skillsSchemas,
    PackageSchema,
    TargetSchema,
    DistributionSchema,
    DistributedPackageSchema,
  ]);

  let repository: DistributedPackageRepository;
  let pkg: Package;

  const distributionId = createDistributionId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());

  const store = async (
    versionSpec: string | null,
    latestReleaseVersion: string | null = null,
  ) => {
    const id = createDistributedPackageId(uuidv4());
    await repository.add({
      id,
      distributionId,
      packageId: pkg.id,
      standardVersions: [],
      recipeVersions: [],
      skillVersions: [],
      operation: 'add',
      versionSpec,
      latestReleaseVersion,
    });
    const [found] = await repository.findByDistributionId(distributionId);
    return found;
  };

  beforeAll(async () => {
    await fixture.initialize();
    fixture.snapshot();
  });

  afterAll(() => fixture.destroy());

  afterEach(async () => {
    await fixture.cleanup();
  });

  beforeEach(async () => {
    repository = new DistributedPackageRepository(
      fixture.datasource.getRepository(DistributedPackageSchema),
      stubLogger(),
    );

    pkg = packageFactory();
    await fixture.datasource.getRepository(PackageSchema).save(pkg);

    await fixture.datasource.getRepository(OrganizationSchema).save({
      id: organizationId,
      name: `Org ${uuidv4()}`,
      slug: `org-${uuidv4()}`,
    });
    const provider = gitProviderFactory({ organizationId });
    await fixture.datasource.getRepository(GitProviderSchema).save(provider);
    const gitRepo = gitRepoFactory({ providerId: provider.id });
    await fixture.datasource.getRepository(GitRepoSchema).save(gitRepo);

    const target = targetFactory({ gitRepoId: gitRepo.id });
    await fixture.datasource.getRepository(TargetSchema).save(target);
    await fixture.datasource.getRepository(DistributionSchema).save({
      id: distributionId,
      authorId: createUserId(uuidv4()),
      organizationId,
      target,
      status: DistributionStatus.success,
      renderModes: [],
      createdAt: new Date().toISOString(),
      distributedPackages: [],
    });
  });

  describe('when a destination is pinned to a release', () => {
    it('reads the release back off the stored row', async () => {
      expect((await store('0.2.0')).versionSpec).toBe('0.2.0');
    });
  });

  describe('when a destination tracks the live package', () => {
    it('reads the wildcard back off the stored row', async () => {
      expect((await store('*')).versionSpec).toBe('*');
    });

    it('reads the release it was built on back off the stored row', async () => {
      expect((await store('*', '0.2.0')).latestReleaseVersion).toBe('0.2.0');
    });
  });

  describe('when the write records no spec', () => {
    it('reads back as null rather than as a missing column', async () => {
      expect((await store(null)).versionSpec).toBeNull();
    });

    it('reads no base release back as null', async () => {
      expect((await store(null)).latestReleaseVersion).toBeNull();
    });
  });
});
