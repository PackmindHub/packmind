import { GetOrganizationBySlugUseCase } from './GetOrganizationBySlugUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { Organization, createOrganizationId } from '@packmind/types';

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
      beforeEach(() => {
        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(
          mockOrganization,
        );
      });

      it('returns organization successfully', async () => {
        const result = await getOrganizationBySlugUseCase.execute(validCommand);

        expect(result).toEqual({ organization: mockOrganization });
      });

      it('calls organization service with correct slug', async () => {
        await getOrganizationBySlugUseCase.execute(validCommand);

        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(organizationSlug);
      });
    });

    describe('when organization does not exist', () => {
      beforeEach(() => {
        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(null);
      });

      it('returns null organization', async () => {
        const result = await getOrganizationBySlugUseCase.execute(validCommand);

        expect(result).toEqual({ organization: null });
      });

      it('calls organization service with correct slug', async () => {
        await getOrganizationBySlugUseCase.execute(validCommand);

        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(organizationSlug);
      });
    });

    describe('when service throws error', () => {
      const serviceError = new Error('Database connection failed');

      beforeEach(() => {
        mockOrganizationService.getOrganizationBySlug.mockRejectedValue(
          serviceError,
        );
      });

      it('rethrows error', async () => {
        await expect(
          getOrganizationBySlugUseCase.execute(validCommand),
        ).rejects.toThrow('Database connection failed');
      });

      it('calls organization service with correct slug', async () => {
        await getOrganizationBySlugUseCase.execute(validCommand).catch(() => {
          // Expected to throw - catch to verify side effects
        });

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
      const differentSlug = 'different-organization';
      const differentCommand = {
        slug: differentSlug,
      };
      const differentOrganization: Organization = {
        id: createOrganizationId('different-org-456'),
        name: 'Different Organization',
        slug: differentSlug,
      };

      beforeEach(() => {
        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(
          differentOrganization,
        );
      });

      it('returns organization for different slug', async () => {
        const result =
          await getOrganizationBySlugUseCase.execute(differentCommand);

        expect(result).toEqual({ organization: differentOrganization });
      });

      it('calls organization service with different slug', async () => {
        await getOrganizationBySlugUseCase.execute(differentCommand);

        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(differentSlug);
      });
    });
  });
});
