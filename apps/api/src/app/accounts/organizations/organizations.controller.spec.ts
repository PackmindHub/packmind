import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import {
  Organization,
  createOrganizationId,
  AccountsHexa,
} from '@packmind/accounts';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { organizationFactory } from '@packmind/accounts/test';

describe('OrganizationsController', () => {
  let app: TestingModule;
  let organizationsController: OrganizationsController;
  let organizationsService: OrganizationsService;

  beforeAll(async () => {
    const mockAccountsApp = {
      listOrganizations: jest.fn(),
      getOrganizationById: jest.fn(),
      getOrganizationByName: jest.fn(),
      getOrganizationBySlug: jest.fn(),
      createOrganization: jest.fn(),
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

  describe('getOrganizations', () => {
    it('returns an array of organizations', async () => {
      const result: Organization[] = [
        organizationFactory({
          id: createOrganizationId('1'),
          name: 'Test Org 1',
          slug: 'test-org-1',
        }),
        organizationFactory({
          id: createOrganizationId('2'),
          name: 'Test Org 2',
          slug: 'test-org-2',
        }),
      ];
      jest
        .spyOn(organizationsService, 'getOrganizations')
        .mockImplementation(async () => result);

      expect(await organizationsController.getOrganizations()).toBe(result);
    });
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

  describe('createOrganization', () => {
    it('creates an organization', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('1'),
        name: 'Test Org',
        slug: 'test-org',
      });

      const createOrganizationSpy = jest
        .spyOn(organizationsService, 'createOrganization')
        .mockImplementation(async () => organization);

      const result = await organizationsController.createOrganization({
        name: 'Test Org',
      });
      expect(createOrganizationSpy).toHaveBeenCalledWith('Test Org');
      expect(result).toEqual(organization);
    });

    describe('when name is empty', () => {
      it('throws BadRequestException', async () => {
        await expect(
          organizationsController.createOrganization({ name: '' }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
