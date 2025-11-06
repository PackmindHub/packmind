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
    it('creates a new organization successfully', async () => {
      const name = 'Test Organization';

      mockOrganizationRepository.findBySlug.mockResolvedValue(null);
      mockOrganizationRepository.add.mockResolvedValue({
        id: expect.any(String),
        name,
        slug: 'test-organization',
      });

      const result = await organizationService.createOrganization(name);

      expect(mockSlug).toHaveBeenCalledWith(name);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
        'test-organization',
      );
      expect(mockOrganizationRepository.add).toHaveBeenCalledWith({
        id: expect.any(String),
        name,
        slug: 'test-organization',
      });
      expect(result.name).toBe(name);
      expect(result.slug).toBe('test-organization');
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
        expect(mockOrganizationRepository.add).not.toHaveBeenCalled();
      });
    });

    it('generates correct slug for organization with spaces', async () => {
      const name = 'My Complex Organization Name';
      mockSlug.mockReturnValue('my-complex-organization-name');

      mockOrganizationRepository.findBySlug.mockResolvedValue(null);
      mockOrganizationRepository.add.mockResolvedValue({
        id: expect.any(String),
        name,
        slug: 'my-complex-organization-name',
      });

      await organizationService.createOrganization(name);

      expect(mockSlug).toHaveBeenCalledWith(name);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
        'my-complex-organization-name',
      );
      expect(mockOrganizationRepository.add).toHaveBeenCalledWith({
        id: expect.any(String),
        name,
        slug: 'my-complex-organization-name',
      });
    });
  });

  describe('.getOrganizationById', () => {
    describe('when organization is found', () => {
      it('returns organization', async () => {
        const organizationId = '123e4567-e89b-12d3-a456-426614174000';
        const expectedOrganization = organizationFactory({
          id: createOrganizationId(organizationId),
        });

        mockOrganizationRepository.findById.mockResolvedValue(
          expectedOrganization,
        );

        const result = await organizationService.getOrganizationById(
          createOrganizationId(organizationId),
        );

        expect(result).toEqual(expectedOrganization);
        expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('when organization is not found', () => {
      it('returns null', async () => {
        const organizationId = '123e4567-e89b-12d3-a456-426614174000';

        mockOrganizationRepository.findById.mockResolvedValue(null);

        const result = await organizationService.getOrganizationById(
          createOrganizationId(organizationId),
        );

        expect(result).toBeNull();
        expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });
  });

  describe('.getOrganizationByName', () => {
    describe('when organization is found', () => {
      it('returns organization by slugifying the name', async () => {
        const name = 'Test Organization';
        const expectedSlug = 'test-organization';
        const expectedOrganization = organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          name,
          slug: expectedSlug,
        });

        mockOrganizationRepository.findBySlug.mockResolvedValue(
          expectedOrganization,
        );

        const result = await organizationService.getOrganizationByName(name);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          expectedSlug,
        );
        expect(result).toEqual(expectedOrganization);
      });
    });

    describe('when organization is not found', () => {
      it('returns null', async () => {
        const name = 'Test Organization';
        const expectedSlug = 'test-organization';

        mockOrganizationRepository.findBySlug.mockResolvedValue(null);

        const result = await organizationService.getOrganizationByName(name);

        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          expectedSlug,
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('.getOrganizationBySlug', () => {
    describe('when organization is found', () => {
      it('returns organization', async () => {
        const organizationSlug = 'test-organization';
        const expectedOrganization = organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          slug: organizationSlug,
        });

        mockOrganizationRepository.findBySlug.mockResolvedValue(
          expectedOrganization,
        );

        const result =
          await organizationService.getOrganizationBySlug(organizationSlug);

        expect(result).toEqual(expectedOrganization);
        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          organizationSlug,
        );
      });
    });

    describe('when organization is not found', () => {
      it('returns null', async () => {
        const organizationSlug = 'non-existent-organization';

        mockOrganizationRepository.findBySlug.mockResolvedValue(null);

        const result =
          await organizationService.getOrganizationBySlug(organizationSlug);

        expect(result).toBeNull();
        expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(
          organizationSlug,
        );
      });
    });
  });

  describe('.listOrganizations', () => {
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

      expect(mockOrganizationRepository.list).toHaveBeenCalled();
      expect(result).toEqual(expectedOrganizations);
    });
  });
});
