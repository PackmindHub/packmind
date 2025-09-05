import { GetOrganizationByNameUseCase } from './GetOrganizationByNameUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/shared/test';
import { PackmindLogger } from '@packmind/shared';
import {
  Organization,
  createOrganizationId,
} from '../../../domain/entities/Organization';

describe('GetOrganizationByNameUseCase', () => {
  let getOrganizationByNameUseCase: GetOrganizationByNameUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = {
      getOrganizationByName: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    stubbedLogger = stubLogger();

    getOrganizationByNameUseCase = new GetOrganizationByNameUseCase(
      mockOrganizationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const organizationName = 'Test Organization';
    const validCommand = {
      name: organizationName,
    };

    const mockOrganization: Organization = {
      id: createOrganizationId('org-123'),
      name: organizationName,
      slug: 'test-organization',
    };

    describe('when organization exists', () => {
      it('returns organization successfully', async () => {
        mockOrganizationService.getOrganizationByName.mockResolvedValue(
          mockOrganization,
        );

        const result = await getOrganizationByNameUseCase.execute(validCommand);

        expect(result).toEqual({ organization: mockOrganization });
        expect(
          mockOrganizationService.getOrganizationByName,
        ).toHaveBeenCalledWith(organizationName);
      });
    });

    describe('when organization does not exist', () => {
      it('returns null organization', async () => {
        mockOrganizationService.getOrganizationByName.mockResolvedValue(null);

        const result = await getOrganizationByNameUseCase.execute(validCommand);

        expect(result).toEqual({ organization: null });
        expect(
          mockOrganizationService.getOrganizationByName,
        ).toHaveBeenCalledWith(organizationName);
      });
    });

    describe('when service throws error', () => {
      it('rethrows error', async () => {
        const serviceError = new Error('Database connection failed');
        mockOrganizationService.getOrganizationByName.mockRejectedValue(
          serviceError,
        );

        await expect(
          getOrganizationByNameUseCase.execute(validCommand),
        ).rejects.toThrow('Database connection failed');

        expect(
          mockOrganizationService.getOrganizationByName,
        ).toHaveBeenCalledWith(organizationName);
      });
    });

    describe('when service throws non-Error exception', () => {
      it('rethrows exception', async () => {
        const serviceError = 'Service unavailable';
        mockOrganizationService.getOrganizationByName.mockRejectedValue(
          serviceError,
        );

        await expect(
          getOrganizationByNameUseCase.execute(validCommand),
        ).rejects.toBe('Service unavailable');
      });
    });

    describe('when handling different organization names', () => {
      it('handles different organization names correctly', async () => {
        const differentName = 'Different Organization';
        const differentCommand = {
          name: differentName,
        };
        const differentOrganization: Organization = {
          id: createOrganizationId('different-org-456'),
          name: differentName,
          slug: 'different-organization',
        };
        mockOrganizationService.getOrganizationByName.mockResolvedValue(
          differentOrganization,
        );

        const result =
          await getOrganizationByNameUseCase.execute(differentCommand);

        expect(result).toEqual({ organization: differentOrganization });
        expect(
          mockOrganizationService.getOrganizationByName,
        ).toHaveBeenCalledWith(differentName);
      });
    });
  });
});
