import { GetOrganizationByIdUseCase } from './GetOrganizationByIdUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/shared/test';
import { PackmindLogger } from '@packmind/shared';
import {
  Organization,
  createOrganizationId,
} from '../../../domain/entities/Organization';

describe('GetOrganizationByIdUseCase', () => {
  let getOrganizationByIdUseCase: GetOrganizationByIdUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    stubbedLogger = stubLogger();

    getOrganizationByIdUseCase = new GetOrganizationByIdUseCase(
      mockOrganizationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const organizationId = createOrganizationId('org-123');
    const validCommand = {
      organizationId,
    };

    const mockOrganization: Organization = {
      id: organizationId,
      name: 'Test Organization',
      slug: 'test-organization',
    };

    describe('with existing organization', () => {
      it('returns organization successfully', async () => {
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          mockOrganization,
        );

        const result = await getOrganizationByIdUseCase.execute(validCommand);

        expect(result).toEqual({ organization: mockOrganization });
        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(organizationId);
      });
    });

    describe('with non-existing organization', () => {
      it('returns null organization', async () => {
        mockOrganizationService.getOrganizationById.mockResolvedValue(null);

        const result = await getOrganizationByIdUseCase.execute(validCommand);

        expect(result).toEqual({ organization: null });
        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(organizationId);
      });
    });

    describe('with service error', () => {
      it('rethrows error', async () => {
        const serviceError = new Error('Database connection failed');
        mockOrganizationService.getOrganizationById.mockRejectedValue(
          serviceError,
        );

        await expect(
          getOrganizationByIdUseCase.execute(validCommand),
        ).rejects.toThrow('Database connection failed');

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(organizationId);
      });
    });

    describe('with non-Error exception', () => {
      it('rethrows exception', async () => {
        const serviceError = 'Service unavailable';
        mockOrganizationService.getOrganizationById.mockRejectedValue(
          serviceError,
        );

        await expect(
          getOrganizationByIdUseCase.execute(validCommand),
        ).rejects.toBe('Service unavailable');
      });
    });

    describe('with different organization IDs', () => {
      it('handles different organization IDs correctly', async () => {
        const differentOrgId = createOrganizationId('different-org-456');
        const differentCommand = {
          organizationId: differentOrgId,
        };
        const differentOrganization: Organization = {
          id: differentOrgId,
          name: 'Different Organization',
          slug: 'different-organization',
        };
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          differentOrganization,
        );

        const result =
          await getOrganizationByIdUseCase.execute(differentCommand);

        expect(result).toEqual({ organization: differentOrganization });
        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(differentOrgId);
      });
    });
  });
});
