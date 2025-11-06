import { itHandlesSoftDelete } from '@packmind/shared/test';
import { DataSource, Repository } from 'typeorm';
import { RenderModeConfigurationRepository } from './RenderModeConfigurationRepository';
import { RenderModeConfigurationSchema } from '../schemas/RenderModeConfigurationSchema';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { RenderMode, RenderModeConfiguration } from '@packmind/shared';
import {
  Organization,
  OrganizationId,
  OrganizationSchema,
  createOrganizationId,
} from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';
import { renderModeConfigurationFactory } from '../../../test';

describe('RenderModeConfigurationRepository', () => {
  let datasource: DataSource;
  let repository: RenderModeConfigurationRepository;
  let organizationRepository: Repository<Organization>;
  let organization: Organization;
  let logger: jest.Mocked<PackmindLogger>;
  const softDeleteOrganizationIds: OrganizationId[] = [];

  const createOrganization = async (nameSuffix = 'default') => {
    return organizationRepository.save({
      id: createOrganizationId(uuidv4()),
      name: `Organization ${nameSuffix}`,
      slug: `organization-${uuidv4()}`,
    });
  };

  beforeEach(async () => {
    logger = stubLogger();
    datasource = await makeTestDatasource([
      RenderModeConfigurationSchema,
      OrganizationSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    repository = new RenderModeConfigurationRepository(
      datasource.getRepository(RenderModeConfigurationSchema),
      logger,
    );

    organizationRepository = datasource.getRepository(OrganizationSchema);
    organization = await createOrganization();
    softDeleteOrganizationIds.length = 0;
  });

  beforeEach(async () => {
    const softDeleteOrganization = await createOrganization('soft-delete');
    softDeleteOrganizationIds.push(softDeleteOrganization.id);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  itHandlesSoftDelete<RenderModeConfiguration>({
    entityFactory: () => {
      const organizationId = softDeleteOrganizationIds.shift();
      if (!organizationId) {
        throw new Error('No organization prepared for soft delete test');
      }

      return renderModeConfigurationFactory({ organizationId });
    },
    getRepository: () => repository,
    queryDeletedEntity: async (id) =>
      datasource.getRepository(RenderModeConfigurationSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  describe('when configuration does not exist', () => {
    it('returns null for organization lookup', async () => {
      const configuration = await repository.findByOrganizationId(
        organization.id,
      );

      expect(configuration).toBeNull();
    });

    it('creates configuration for a new organization entry', async () => {
      const configuration = renderModeConfigurationFactory({
        organizationId: organization.id,
        activeRenderModes: [RenderMode.PACKMIND, RenderMode.AGENTS_MD],
      });

      const storedConfiguration = await repository.upsert(configuration);

      expect(storedConfiguration).toMatchObject({
        organizationId: organization.id,
        activeRenderModes: [RenderMode.PACKMIND, RenderMode.AGENTS_MD],
      });

      const foundConfiguration = await repository.findByOrganizationId(
        organization.id,
      );
      expect(foundConfiguration).not.toBeNull();
      expect(foundConfiguration?.id).toEqual(configuration.id);
      expect(foundConfiguration?.activeRenderModes).toEqual([
        RenderMode.PACKMIND,
        RenderMode.AGENTS_MD,
      ]);
    });
  });

  describe('when configuration already exists', () => {
    it('updates configuration for matching organization', async () => {
      const configuration = renderModeConfigurationFactory({
        organizationId: organization.id,
        activeRenderModes: [RenderMode.PACKMIND, RenderMode.AGENTS_MD],
      });
      await repository.add(configuration);

      const updatedModes = [RenderMode.PACKMIND, RenderMode.CLAUDE];

      const updatedConfiguration = await repository.upsert({
        ...configuration,
        activeRenderModes: updatedModes,
      });

      expect(updatedConfiguration.activeRenderModes).toEqual(updatedModes);

      const persistedConfiguration = await repository.findByOrganizationId(
        organization.id,
      );
      expect(persistedConfiguration?.activeRenderModes).toEqual(updatedModes);
    });

    it('finds configuration by organization id', async () => {
      const configuration = renderModeConfigurationFactory({
        organizationId: organization.id,
        activeRenderModes: [RenderMode.PACKMIND, RenderMode.CURSOR],
      });
      await repository.add(configuration);

      const found = await repository.findByOrganizationId(organization.id);
      expect(found).toMatchObject({
        id: configuration.id,
        organizationId: organization.id,
        activeRenderModes: [RenderMode.PACKMIND, RenderMode.CURSOR],
      });
    });
  });
});
