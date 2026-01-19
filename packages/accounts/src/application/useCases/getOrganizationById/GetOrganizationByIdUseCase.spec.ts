import { GetOrganizationByIdUseCase } from './GetOrganizationByIdUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { Organization, createOrganizationId } from '@packmind/types';

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
      beforeEach(() => {
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          mockOrganization,
        );
      });

      it('returns organization successfully', async () => {
        const result = await getOrganizationByIdUseCase.execute(validCommand);

        expect(result).toEqual({ organization: mockOrganization });
      });

      it('calls organization service with correct id', async () => {
        await getOrganizationByIdUseCase.execute(validCommand);

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(organizationId);
      });
    });

    describe('with non-existing organization', () => {
      beforeEach(() => {
        mockOrganizationService.getOrganizationById.mockResolvedValue(null);
      });

      it('returns null organization', async () => {
        const result = await getOrganizationByIdUseCase.execute(validCommand);

        expect(result).toEqual({ organization: null });
      });

      it('calls organization service with correct id', async () => {
        await getOrganizationByIdUseCase.execute(validCommand);

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(organizationId);
      });
    });

    describe('with service error', () => {
      const serviceError = new Error('Database connection failed');

      beforeEach(() => {
        mockOrganizationService.getOrganizationById.mockRejectedValue(
          serviceError,
        );
      });

      it('rethrows error', async () => {
        await expect(
          getOrganizationByIdUseCase.execute(validCommand),
        ).rejects.toThrow('Database connection failed');
      });

      it('calls organization service with correct id', async () => {
        await getOrganizationByIdUseCase.execute(validCommand).catch(() => {
          // Expected to throw - catch to verify side effects
        });

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
      const differentOrgId = createOrganizationId('different-org-456');
      const differentCommand = {
        organizationId: differentOrgId,
      };
      const differentOrganization: Organization = {
        id: differentOrgId,
        name: 'Different Organization',
        slug: 'different-organization',
      };

      beforeEach(() => {
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          differentOrganization,
        );
      });

      it('returns the correct organization', async () => {
        const result =
          await getOrganizationByIdUseCase.execute(differentCommand);

        expect(result).toEqual({ organization: differentOrganization });
      });

      it('calls organization service with the different id', async () => {
        await getOrganizationByIdUseCase.execute(differentCommand);

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(differentOrgId);
      });
    });
  });
});
