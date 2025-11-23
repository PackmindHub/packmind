import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { createOrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { createUserId, IAccountsPort } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { organizationFactory } from '@packmind/accounts/test';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { ACCOUNTS_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';

describe('OrganizationsController', () => {
  let app: TestingModule;
  let organizationsController: OrganizationsController;
  let organizationsService: OrganizationsService;

  beforeAll(async () => {
    const mockAccountsAdapter: Partial<IAccountsPort> = {
      getOrganizationById: jest.fn(),
      getOrganizationByName: jest.fn(),
      createOrganization: jest.fn(),
      listUserOrganizations: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        OrganizationsService,
        {
          provide: ACCOUNTS_ADAPTER_TOKEN,
          useValue: mockAccountsAdapter,
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();

    organizationsController = app.get<OrganizationsController>(
      OrganizationsController,
    );
    organizationsService = app.get<OrganizationsService>(OrganizationsService);
  });

  describe('getUserOrganizations', () => {
    it('returns user organizations', async () => {
      const userId = createUserId('user-1');
      const organizations = [
        organizationFactory({
          id: createOrganizationId('1'),
          name: 'Org 1',
          slug: 'org-1',
        }),
        organizationFactory({
          id: createOrganizationId('2'),
          name: 'Org 2',
          slug: 'org-2',
        }),
      ];

      jest
        .spyOn(organizationsService, 'getUserOrganizations')
        .mockImplementation(async () => organizations);

      const mockRequest = {
        user: {
          userId,
        },
      } as Partial<AuthenticatedRequest> as AuthenticatedRequest;

      expect(
        await organizationsController.getUserOrganizations(mockRequest),
      ).toBe(organizations);
    });

    it('returns empty array for user with no organizations', async () => {
      const userId = createUserId('user-1');
      jest
        .spyOn(organizationsService, 'getUserOrganizations')
        .mockImplementation(async () => []);

      const mockRequest = {
        user: {
          userId,
        },
      } as Partial<AuthenticatedRequest> as AuthenticatedRequest;

      expect(
        await organizationsController.getUserOrganizations(mockRequest),
      ).toEqual([]);
    });
  });
});
