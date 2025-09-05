import { GetOrganizationBySlugUseCase } from './GetOrganizationBySlugUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/shared/test';
import { PackmindLogger } from '@packmind/shared';
import {
  Organization,
  createOrganizationId,
} from '../../../domain/entities/Organization';

describe('GetOrganizationBySlugUseCase', () => {
  let getOrganizationBySlugUseCase: GetOrganizationBySlugUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = {
      getOrganizationBySlug: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    stubbedLogger = stubLogger();

    getOrganizationBySlugUseCase = new GetOrganizationBySlugUseCase(
      mockOrganizationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const organizationSlug = 'test-organization';
    const validCommand = {
      slug: organizationSlug,
    };

    const mockOrganization: Organization = {
      id: createOrganizationId('org-123'),
      name: 'Test Organization',
      slug: organizationSlug,
    };

    describe('when organization exists', () => {
      it('returns organization successfully', async () => {
        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(
          mockOrganization,
        );

        const result = await getOrganizationBySlugUseCase.execute(validCommand);

        expect(result).toEqual({ organization: mockOrganization });
        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(organizationSlug);
      });
    });

    describe('when organization does not exist', () => {
      it('returns null organization', async () => {
        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(null);

        const result = await getOrganizationBySlugUseCase.execute(validCommand);

        expect(result).toEqual({ organization: null });
        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(organizationSlug);
      });
    });

    describe('when service throws error', () => {
      it('rethrows error', async () => {
        const serviceError = new Error('Database connection failed');
        mockOrganizationService.getOrganizationBySlug.mockRejectedValue(
          serviceError,
        );

        await expect(
          getOrganizationBySlugUseCase.execute(validCommand),
        ).rejects.toThrow('Database connection failed');

        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(organizationSlug);
      });
    });

    describe('when service throws non-Error exception', () => {
      it('rethrows exception', async () => {
        const serviceError = 'Service unavailable';
        mockOrganizationService.getOrganizationBySlug.mockRejectedValue(
          serviceError,
        );

        await expect(
          getOrganizationBySlugUseCase.execute(validCommand),
        ).rejects.toBe('Service unavailable');
      });
    });

    describe('when handling different organization slugs', () => {
      it('handles different organization slugs correctly', async () => {
        const differentSlug = 'different-organization';
        const differentCommand = {
          slug: differentSlug,
        };
        const differentOrganization: Organization = {
          id: createOrganizationId('different-org-456'),
          name: 'Different Organization',
          slug: differentSlug,
        };
        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(
          differentOrganization,
        );

        const result =
          await getOrganizationBySlugUseCase.execute(differentCommand);

        expect(result).toEqual({ organization: differentOrganization });
        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(differentSlug);
      });
    });
  });
});
