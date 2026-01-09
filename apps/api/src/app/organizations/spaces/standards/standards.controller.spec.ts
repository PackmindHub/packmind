import { BadRequestException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  createRuleId,
  createStandardId,
  RuleId,
  Standard,
} from '@packmind/types';
import { StandardsService } from '../../../standards/standards.service';
import { OrganizationsSpacesStandardsController } from './standards.controller';

describe('OrganizationsSpacesStandardsController', () => {
  let controller: OrganizationsSpacesStandardsController;
  let standardsService: jest.Mocked<StandardsService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardsService = {
      getStandardsBySpace: jest.fn(),
      updateStandard: jest.fn(),
    } as unknown as jest.Mocked<StandardsService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesStandardsController(
      standardsService,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStandards', () => {
    describe('when standards exist', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const mockStandards: Standard[] = [
        {
          id: createStandardId('standard-1'),
          slug: 'test-standard',
          name: 'Test Standard',
          description: 'Test description',
          userId,
          spaceId,
          version: 1,
          scope: null,
        },
      ];

      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      let result: { standards: Standard[] };

      beforeEach(async () => {
        standardsService.getStandardsBySpace.mockResolvedValue({
          standards: mockStandards,
        });
        result = await controller.getStandards(orgId, spaceId, request);
      });

      it('returns standards', () => {
        expect(result).toEqual({ standards: mockStandards });
      });

      it('calls service with correct params', () => {
        expect(standardsService.getStandardsBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const error = new Error('Database error');

      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      standardsService.getStandardsBySpace.mockRejectedValue(error);

      await expect(
        controller.getStandards(orgId, spaceId, request),
      ).rejects.toThrow('Database error');
    });

    describe('when standard list is empty', () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');

      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      let result: { standards: Standard[] };

      beforeEach(async () => {
        standardsService.getStandardsBySpace.mockResolvedValue({
          standards: [],
        });
        result = await controller.getStandards(orgId, spaceId, request);
      });

      it('returns empty array', () => {
        expect(result).toEqual({ standards: [] });
      });

      it('calls service with correct params', () => {
        expect(standardsService.getStandardsBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
    });
  });

  describe('updateStandard', () => {
    const orgId = createOrganizationId('org-123');
    const spaceId = createSpaceId('space-456');
    const userId = createUserId('user-1');
    const standardId = createStandardId('standard-1');
    const ruleId = createRuleId('rule-1');

    const request = {
      organization: {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        role: 'admin',
      },
      user: {
        userId,
        name: 'Test User',
      },
    } as unknown as AuthenticatedRequest;

    const validStandard = {
      name: 'Updated Standard',
      description: 'Updated description',
      rules: [
        {
          id: ruleId,
          content: 'Updated rule content',
        },
      ],
      scope: 'backend',
    };

    describe('when update is successful', () => {
      const mockUpdatedStandard: Standard = {
        id: standardId,
        slug: 'updated-standard',
        name: 'Updated Standard',
        description: 'Updated description',
        userId,
        spaceId,
        version: 2,
        scope: 'backend',
      };
      let result: Standard;

      beforeEach(async () => {
        standardsService.updateStandard.mockResolvedValue(mockUpdatedStandard);
        result = await controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          validStandard,
          request,
        );
      });

      it('returns updated standard', () => {
        expect(result).toEqual(mockUpdatedStandard);
      });

      it('calls service with correct params', () => {
        expect(standardsService.updateStandard).toHaveBeenCalledWith(
          standardId,
          validStandard,
          orgId,
          userId,
          spaceId,
        );
      });
    });

    describe('when name is missing', () => {
      const invalidStandard = {
        ...validStandard,
        name: '',
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    describe('when description is missing', () => {
      const invalidStandard = {
        ...validStandard,
        description: '',
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    describe('when rules is not an array', () => {
      const invalidStandard = {
        ...validStandard,
        rules: null as unknown as Array<{ id: RuleId; content: string }>,
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    describe('when rule content is missing', () => {
      const invalidStandard = {
        ...validStandard,
        rules: [
          {
            id: ruleId,
            content: '',
          },
        ],
      };

      it('throws BadRequestException', async () => {
        await expect(
          controller.updateStandard(
            orgId,
            spaceId,
            standardId,
            invalidStandard,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not call updateStandard', async () => {
        await controller
          .updateStandard(orgId, spaceId, standardId, invalidStandard, request)
          .catch(() => {
            /* expected */
          });
        expect(standardsService.updateStandard).not.toHaveBeenCalled();
      });
    });

    it('propagates errors from service', async () => {
      const error = new Error('Database error');
      standardsService.updateStandard.mockRejectedValue(error);

      await expect(
        controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          validStandard,
          request,
        ),
      ).rejects.toThrow('Database error');
    });

    describe('when scope is null', () => {
      const standardWithNullScope = {
        ...validStandard,
        scope: null,
      };

      const mockUpdatedStandard: Standard = {
        id: standardId,
        slug: 'updated-standard',
        name: 'Updated Standard',
        description: 'Updated description',
        userId,
        spaceId,
        version: 2,
        scope: null,
      };

      let result: Standard;

      beforeEach(async () => {
        standardsService.updateStandard.mockResolvedValue(mockUpdatedStandard);
        result = await controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          standardWithNullScope,
          request,
        );
      });

      it('returns updated standard', () => {
        expect(result).toEqual(mockUpdatedStandard);
      });

      it('calls service with correct params', () => {
        expect(standardsService.updateStandard).toHaveBeenCalledWith(
          standardId,
          standardWithNullScope,
          orgId,
          userId,
          spaceId,
        );
      });
    });
  });
});
