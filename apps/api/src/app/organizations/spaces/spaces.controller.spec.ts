import { OrganizationsSpacesController } from './spaces.controller';
import { createOrganizationId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';
import { stubLogger } from '@packmind/shared/test';
import { PackmindLogger } from '@packmind/shared';

describe('OrganizationsSpacesController', () => {
  let controller: OrganizationsSpacesController;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    logger = stubLogger();
    controller = new OrganizationsSpacesController(logger);
  });

  it('returns space info with organization and space IDs', async () => {
    const orgId = createOrganizationId('test-org-id');
    const spaceId = createSpaceId('test-space-id');

    const result = await controller.getSpaceInfo(orgId, spaceId);

    expect(result).toEqual({
      message: 'Space routing active',
      organizationId: orgId,
      spaceId,
    });
  });
});
