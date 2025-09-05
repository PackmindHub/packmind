import { ListOrganizationsUseCase } from './ListOrganizationsUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/shared/test';
import { PackmindLogger } from '@packmind/shared';
import {
  Organization,
  createOrganizationId,
} from '../../../domain/entities/Organization';

describe('ListOrganizationsUseCase', () => {
  let listOrganizationsUseCase: ListOrganizationsUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = {
      listOrganizations: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    stubbedLogger = stubLogger();

    listOrganizationsUseCase = new ListOrganizationsUseCase(
      mockOrganizationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validCommand = {};

    const mockOrganizations: Organization[] = [
      {
        id: createOrganizationId('org-1'),
        name: 'Organization 1',
        slug: 'organization-1',
      },
      {
        id: createOrganizationId('org-2'),
        name: 'Organization 2',
        slug: 'organization-2',
      },
    ];

    describe('when organizations exist', () => {
      it('returns organizations successfully', async () => {
        mockOrganizationService.listOrganizations.mockResolvedValue(
          mockOrganizations,
        );

        const result = await listOrganizationsUseCase.execute(validCommand);

        expect(result).toEqual({ organizations: mockOrganizations });
        expect(
          mockOrganizationService.listOrganizations,
        ).toHaveBeenCalledWith();
      });
    });

    describe('when no organizations exist', () => {
      it('returns empty array', async () => {
        mockOrganizationService.listOrganizations.mockResolvedValue([]);

        const result = await listOrganizationsUseCase.execute(validCommand);

        expect(result).toEqual({ organizations: [] });
        expect(
          mockOrganizationService.listOrganizations,
        ).toHaveBeenCalledWith();
      });
    });

    describe('when service throws error', () => {
      it('rethrows error', async () => {
        const serviceError = new Error('Database connection failed');
        mockOrganizationService.listOrganizations.mockRejectedValue(
          serviceError,
        );

        await expect(
          listOrganizationsUseCase.execute(validCommand),
        ).rejects.toThrow('Database connection failed');

        expect(
          mockOrganizationService.listOrganizations,
        ).toHaveBeenCalledWith();
      });
    });

    describe('when service throws non-Error exception', () => {
      it('rethrows exception', async () => {
        const serviceError = 'Service unavailable';
        mockOrganizationService.listOrganizations.mockRejectedValue(
          serviceError,
        );

        await expect(
          listOrganizationsUseCase.execute(validCommand),
        ).rejects.toBe('Service unavailable');
      });
    });

    describe('when handling different organization counts', () => {
      it('handles single organization correctly', async () => {
        const singleOrganization = [mockOrganizations[0]];
        mockOrganizationService.listOrganizations.mockResolvedValue(
          singleOrganization,
        );

        const result = await listOrganizationsUseCase.execute(validCommand);

        expect(result).toEqual({ organizations: singleOrganization });
        expect(
          mockOrganizationService.listOrganizations,
        ).toHaveBeenCalledWith();
      });

      it('handles multiple organizations correctly', async () => {
        const multipleOrganizations = [
          ...mockOrganizations,
          {
            id: createOrganizationId('org-3'),
            name: 'Organization 3',
            slug: 'organization-3',
          },
        ];
        mockOrganizationService.listOrganizations.mockResolvedValue(
          multipleOrganizations,
        );

        const result = await listOrganizationsUseCase.execute(validCommand);

        expect(result).toEqual({ organizations: multipleOrganizations });
        expect(
          mockOrganizationService.listOrganizations,
        ).toHaveBeenCalledWith();
      });
    });
  });
});
