import { CreateOrganizationUseCase } from './CreateOrganizationUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/shared/test';
import { PackmindLogger } from '@packmind/shared';
import {
  Organization,
  createOrganizationId,
} from '../../../domain/entities/Organization';

describe('CreateOrganizationUseCase', () => {
  let createOrganizationUseCase: CreateOrganizationUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = {
      createOrganization: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    stubbedLogger = stubLogger();

    createOrganizationUseCase = new CreateOrganizationUseCase(
      mockOrganizationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validCommand = {
      name: 'Test Organization',
    };

    const mockOrganization: Organization = {
      id: createOrganizationId('org-123'),
      name: 'Test Organization',
      slug: 'test-organization',
    };

    describe('with valid organization name', () => {
      it('creates organization successfully', async () => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );

        const result = await createOrganizationUseCase.execute(validCommand);

        expect(result).toEqual({ organization: mockOrganization });
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
      });
    });

    describe('with organization name having whitespace', () => {
      it('trims whitespace and creates organization', async () => {
        const commandWithWhitespace = {
          name: '  Test Organization  ',
        };
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );

        const result = await createOrganizationUseCase.execute(
          commandWithWhitespace,
        );

        expect(result).toEqual({ organization: mockOrganization });
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
      });
    });

    describe('with empty organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          name: '',
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with whitespace-only organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          name: '   ',
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with null organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          name: null as unknown as string,
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with undefined organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          name: undefined as unknown as string,
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with service error', () => {
      it('rethrows error', async () => {
        const serviceError = new Error('Organization already exists');
        mockOrganizationService.createOrganization.mockRejectedValue(
          serviceError,
        );

        await expect(
          createOrganizationUseCase.execute(validCommand),
        ).rejects.toThrow('Organization already exists');

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
      });
    });

    describe('with non-Error exception', () => {
      it('rethrows exception', async () => {
        const serviceError = 'Database connection failed';
        mockOrganizationService.createOrganization.mockRejectedValue(
          serviceError,
        );

        await expect(
          createOrganizationUseCase.execute(validCommand),
        ).rejects.toBe('Database connection failed');
      });
    });

    describe('with minimal valid organization name', () => {
      it('creates organization successfully', async () => {
        const minimalCommand = {
          name: 'A',
        };
        const minimalOrganization: Organization = {
          ...mockOrganization,
          name: 'A',
          slug: 'a',
        };
        mockOrganizationService.createOrganization.mockResolvedValue(
          minimalOrganization,
        );

        const result = await createOrganizationUseCase.execute(minimalCommand);

        expect(result).toEqual({ organization: minimalOrganization });
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'A',
        );
      });
    });
  });
});
