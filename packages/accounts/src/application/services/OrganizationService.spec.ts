import { OrganizationService } from './OrganizationService';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import { createOrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { organizationFactory } from '../../../test';

// Mock the slug package
jest.mock('slug', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import slug from 'slug';
const mockSlug = jest.mocked(slug);

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockOrganizationRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IOrganizationRepository>;

    stubbedLogger = stubLogger();

    organizationService = new OrganizationService(
      mockOrganizationRepository,
      stubbedLogger,
    );
    mockSlug.mockReturnValue('test-organization');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('.createOrganization', () => {
    describe('when creating a new organization successfully', () => {
      const name = 'Test Organization';

      beforeEach(() => {
        mockOrganizationRepository.findBySlug.mockResolvedValue(null);
        mockOrganizationRepository.add.mockResolvedValue({
          id: expect.any(String),
          name,
          slug: 'test-organization',
        });
      });

      it('calls slug with the organization name', async () => {
        await organizationService.createOrganization(name);

        expect(mockSlug).toHaveBeenCalledWith(name);
      });

      it('checks if slug already exists', async () => {
        await organizationService.createOrganization(name);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          'test-organization',
        );
      });

      it('adds the organization to the repository', async () => {
        await organizationService.createOrganization(name);

        expect(mockOrganizationRepository.add).toHaveBeenCalledWith({
          id: expect.any(String),
          name,
          slug: 'test-organization',
        });
      });

      it('returns organization with correct name', async () => {
        const result = await organizationService.createOrganization(name);

        expect(result.name).toBe(name);
      });

      it('returns organization with correct slug', async () => {
        const result = await organizationService.createOrganization(name);

        expect(result.slug).toBe('test-organization');
      });
    });

    describe('when organization slug already exists', () => {
      it('throws error', async () => {
        const name = 'Test Organization';
        const existingOrganization = organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          name: 'Different Name',
          slug: 'test-organization',
        });

        mockOrganizationRepository.findBySlug.mockResolvedValue(
          existingOrganization,
        );

        await expect(
          organizationService.createOrganization(name),
        ).rejects.toThrow(
          'An organization with a similar name already exists. The name "Test Organization" conflicts with an existing organization when converted to URL-friendly format.',
        );
      });

      it('does not add organization to repository', async () => {
        const name = 'Test Organization';
        const existingOrganization = organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          name: 'Different Name',
          slug: 'test-organization',
        });

        mockOrganizationRepository.findBySlug.mockResolvedValue(
          existingOrganization,
        );

        try {
          await organizationService.createOrganization(name);
        } catch {
          // Expected to throw
        }

        expect(mockOrganizationRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when organization has spaces in name', () => {
      const name = 'My Complex Organization Name';

      beforeEach(() => {
        mockSlug.mockReturnValue('my-complex-organization-name');
        mockOrganizationRepository.findBySlug.mockResolvedValue(null);
        mockOrganizationRepository.add.mockResolvedValue({
          id: expect.any(String),
          name,
          slug: 'my-complex-organization-name',
        });
      });

      it('calls slug with the organization name', async () => {
        await organizationService.createOrganization(name);

        expect(mockSlug).toHaveBeenCalledWith(name);
      });

      it('checks if generated slug exists', async () => {
        await organizationService.createOrganization(name);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          'my-complex-organization-name',
        );
      });

      it('adds organization with correct slug', async () => {
        await organizationService.createOrganization(name);

        expect(mockOrganizationRepository.add).toHaveBeenCalledWith({
          id: expect.any(String),
          name,
          slug: 'my-complex-organization-name',
        });
      });
    });
  });

  describe('.getOrganizationById', () => {
    describe('when organization is found', () => {
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';
      let expectedOrganization: ReturnType<typeof organizationFactory>;

      beforeEach(() => {
        expectedOrganization = organizationFactory({
          id: createOrganizationId(organizationId),
        });
        mockOrganizationRepository.findById.mockResolvedValue(
          expectedOrganization,
        );
      });

      it('returns organization', async () => {
        const result = await organizationService.getOrganizationById(
          createOrganizationId(organizationId),
        );

        expect(result).toEqual(expectedOrganization);
      });

      it('calls repository with organization id', async () => {
        await organizationService.getOrganizationById(
          createOrganizationId(organizationId),
        );

        expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('when organization is not found', () => {
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      beforeEach(() => {
        mockOrganizationRepository.findById.mockResolvedValue(null);
      });

      it('returns null', async () => {
        const result = await organizationService.getOrganizationById(
          createOrganizationId(organizationId),
        );

        expect(result).toBeNull();
      });

      it('calls repository with organization id', async () => {
        await organizationService.getOrganizationById(
          createOrganizationId(organizationId),
        );

        expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });
  });

  describe('.getOrganizationByName', () => {
    describe('when organization is found', () => {
      const name = 'Test Organization';
      const expectedSlug = 'test-organization';
      let expectedOrganization: ReturnType<typeof organizationFactory>;

      beforeEach(() => {
        expectedOrganization = organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          name,
          slug: expectedSlug,
        });
        mockOrganizationRepository.findBySlug.mockResolvedValue(
          expectedOrganization,
        );
      });

      it('calls repository with slugified name', async () => {
        await organizationService.getOrganizationByName(name);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          expectedSlug,
        );
      });

      it('returns organization', async () => {
        const result = await organizationService.getOrganizationByName(name);

        expect(result).toEqual(expectedOrganization);
      });
    });

    describe('when organization is not found', () => {
      const name = 'Test Organization';
      const expectedSlug = 'test-organization';

      beforeEach(() => {
        mockOrganizationRepository.findBySlug.mockResolvedValue(null);
      });

      it('calls repository with slugified name', async () => {
        await organizationService.getOrganizationByName(name);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          expectedSlug,
        );
      });

      it('returns null', async () => {
        const result = await organizationService.getOrganizationByName(name);

        expect(result).toBeNull();
      });
    });
  });

  describe('.getOrganizationBySlug', () => {
    describe('when organization is found', () => {
      const organizationSlug = 'test-organization';
      let expectedOrganization: ReturnType<typeof organizationFactory>;

      beforeEach(() => {
        expectedOrganization = organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          slug: organizationSlug,
        });
        mockOrganizationRepository.findBySlug.mockResolvedValue(
          expectedOrganization,
        );
      });

      it('returns organization', async () => {
        const result =
          await organizationService.getOrganizationBySlug(organizationSlug);

        expect(result).toEqual(expectedOrganization);
      });

      it('calls repository with slug', async () => {
        await organizationService.getOrganizationBySlug(organizationSlug);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          organizationSlug,
        );
      });
    });

    describe('when organization is not found', () => {
      const organizationSlug = 'non-existent-organization';

      beforeEach(() => {
        mockOrganizationRepository.findBySlug.mockResolvedValue(null);
      });

      it('returns null', async () => {
        const result =
          await organizationService.getOrganizationBySlug(organizationSlug);

        expect(result).toBeNull();
      });

      it('calls repository with slug', async () => {
        await organizationService.getOrganizationBySlug(organizationSlug);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          organizationSlug,
        );
      });
    });
  });

  describe('.listOrganizations', () => {
    it('calls repository list method', async () => {
      const expectedOrganizations = [
        organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          name: 'Test Organization 1',
          slug: 'test-organization-1',
        }),
        organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
          name: 'Test Organization 2',
          slug: 'test-organization-2',
        }),
      ];

      mockOrganizationRepository.list.mockResolvedValue(expectedOrganizations);

      await organizationService.listOrganizations();

      expect(mockOrganizationRepository.list).toHaveBeenCalled();
    });

    it('returns all organizations', async () => {
      const expectedOrganizations = [
        organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          name: 'Test Organization 1',
          slug: 'test-organization-1',
        }),
        organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
          name: 'Test Organization 2',
          slug: 'test-organization-2',
        }),
      ];

      mockOrganizationRepository.list.mockResolvedValue(expectedOrganizations);

      const result = await organizationService.listOrganizations();

      expect(result).toEqual(expectedOrganizations);
    });
  });
});
