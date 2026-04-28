import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { SpacesManagementAdapter } from './SpacesManagementAdapter';

describe('SpacesManagementAdapter', () => {
  const userId = createUserId('user-1');
  const organizationId = createOrganizationId('org-1');

  let adapter: SpacesManagementAdapter;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;

  beforeEach(async () => {
    const orgAdminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    const organization = organizationFactory({ id: organizationId });

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(orgAdminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      findOrgPagePaginated: jest
        .fn()
        .mockResolvedValue({ items: [], totalCount: 0 }),
      findAdminsForSpaceIds: jest.fn().mockResolvedValue([]),
      countByRoleForSpaceIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<ISpacesPort>;

    standardsPort = {
      countBySpaceIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      countBySpaceIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<IRecipesPort>;

    skillsPort = {
      countBySpaceIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<ISkillsPort>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    adapter = new SpacesManagementAdapter();
    await adapter.initialize({
      [IAccountsPortName]: accountsPort,
      [ISpacesPortName]: spacesPort,
      [IStandardsPortName]: standardsPort,
      [IRecipesPortName]: recipesPort,
      [ISkillsPortName]: skillsPort,
      eventEmitterService,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listOrganizationSpacesForManagement', () => {
    it('instantiates ListOrganizationSpacesForManagementUseCase with the configured ports and returns its response', async () => {
      const result = await adapter.listOrganizationSpacesForManagement({
        userId: userId as unknown as string,
        organizationId: organizationId as unknown as string,
        page: 1,
      });

      expect(result).toEqual({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 8,
      });
      expect(spacesPort.findOrgPagePaginated).toHaveBeenCalledWith(
        organizationId,
        1,
        8,
      );
    });
  });
});
