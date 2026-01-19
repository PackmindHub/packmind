import { GetOrganizationByNameUseCase } from './GetOrganizationByNameUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { stubLogger } from '@packmind/test-utils';
import { organizationFactory } from '../../../../test/organizationFactory';
import { createOrganizationId } from '@packmind/types';

jest.mock('../../services/OrganizationService');

describe('GetOrganizationByNameUseCase', () => {
  let useCase: GetOrganizationByNameUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;

  beforeEach(() => {
    mockOrganizationService = new OrganizationService(
      {} as never,
      {} as never,
    ) as jest.Mocked<OrganizationService>;

    useCase = new GetOrganizationByNameUseCase(
      mockOrganizationService,
      stubLogger(),
    );
  });

  describe('.execute', () => {
    describe('when organization is found', () => {
      const name = 'Test Organization';
      const expectedSlug = 'test-organization';
      let expectedOrganization: ReturnType<typeof organizationFactory>;
      let result: {
        organization: ReturnType<typeof organizationFactory> | null;
      };

      beforeEach(async () => {
        expectedOrganization = organizationFactory({
          id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
          name,
          slug: expectedSlug,
        });

        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(
          expectedOrganization,
        );

        result = await useCase.execute({ name });
      });

      it('searches by slugified name', () => {
        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(expectedSlug);
      });

      it('returns the organization', () => {
        expect(result.organization).toEqual(expectedOrganization);
      });
    });

    describe('when organization is not found', () => {
      const name = 'Non-existent Organization';
      const expectedSlug = 'non-existent-organization';
      let result: {
        organization: ReturnType<typeof organizationFactory> | null;
      };

      beforeEach(async () => {
        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(null);
        result = await useCase.execute({ name });
      });

      it('searches by slugified name', () => {
        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(expectedSlug);
      });

      it('returns null', () => {
        expect(result.organization).toBeNull();
      });
    });

    describe('when service throws an error', () => {
      it('logs error and rethrows', async () => {
        const name = 'Test Organization';
        const error = new Error('Database error');

        mockOrganizationService.getOrganizationBySlug.mockRejectedValue(error);

        await expect(useCase.execute({ name })).rejects.toThrow(error);
      });
    });

    describe('slug generation', () => {
      it('properly handles special characters and spaces', async () => {
        const name = 'My Company & Co.!';
        const expectedSlug = 'my-company-co';

        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(null);

        await useCase.execute({ name });

        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(expectedSlug);
      });

      it('properly handles case insensitive matching', async () => {
        const name = 'TEST ORGANIZATION';
        const expectedSlug = 'test-organization';

        mockOrganizationService.getOrganizationBySlug.mockResolvedValue(null);

        await useCase.execute({ name });

        expect(
          mockOrganizationService.getOrganizationBySlug,
        ).toHaveBeenCalledWith(expectedSlug);
      });
    });
  });
});
