import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { createOrganizationId, AccountsHexa } from '@packmind/accounts';
import { NotFoundException } from '@nestjs/common';
import { PackmindLogger, createUserId } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { organizationFactory } from '@packmind/accounts/test';
import { AuthenticatedRequest } from '@packmind/shared-nest';

describe('OrganizationsController', () => {
  let app: TestingModule;
  let organizationsController: OrganizationsController;
  let organizationsService: OrganizationsService;

  beforeAll(async () => {
    const mockAccountsApp = {
      getOrganizationById: jest.fn(),
      getOrganizationByName: jest.fn(),
      getOrganizationBySlug: jest.fn(),
      createOrganization: jest.fn(),
      removeUserFromOrganization: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        OrganizationsService,
        {
          provide: AccountsHexa,
          useValue: mockAccountsApp,
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

  describe('getOrganizationById', () => {
    describe('when organization is found', () => {
      it('returns the organization', async () => {
        const organizationId = createOrganizationId('1');
        const result = organizationFactory({
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        });
        jest
          .spyOn(organizationsService, 'getOrganizationById')
          .mockImplementation(async () => result);

        expect(
          await organizationsController.getOrganizationById(organizationId),
        ).toBe(result);
      });
    });

    describe('when organization is not found', () => {
      it('throws NotFoundException', async () => {
        const organizationId = createOrganizationId('1');
        jest
          .spyOn(organizationsService, 'getOrganizationById')
          .mockImplementation(async () => null);

        await expect(
          organizationsController.getOrganizationById(organizationId),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('getOrganizationBySlug', () => {
    describe('when organization is found', () => {
      it('returns the organization', async () => {
        const result = organizationFactory({
          id: createOrganizationId('1'),
          name: 'Test Org',
          slug: 'test-org',
        });
        jest
          .spyOn(organizationsService, 'getOrganizationBySlug')
          .mockImplementation(async () => result);

        expect(
          await organizationsController.getOrganizationBySlug('test-org'),
        ).toBe(result);
      });
    });

    describe('when organization is not found', () => {
      it('throws NotFoundException', async () => {
        jest
          .spyOn(organizationsService, 'getOrganizationBySlug')
          .mockImplementation(async () => null);

        await expect(
          organizationsController.getOrganizationBySlug('non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });
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
