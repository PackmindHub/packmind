import { OrganizationsSpacesStandardsController } from './standards.controller';
import { StandardsService } from '../../../standards/standards.service';
import { createOrganizationId, createUserId } from '@packmind/types';
import { createSpaceId } from '@packmind/spaces';
import { stubLogger } from '@packmind/test-utils';
import {
  Standard,
  createStandardId,
  createRuleId,
  RuleId,
} from '@packmind/standards';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { BadRequestException } from '@nestjs/common';

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
    it('returns standards for space within organization', async () => {
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

      standardsService.getStandardsBySpace.mockResolvedValue({
        standards: mockStandards,
      });

      const result = await controller.getStandards(orgId, spaceId, request);

      expect(result).toEqual({ standards: mockStandards });
      expect(standardsService.getStandardsBySpace).toHaveBeenCalledWith(
        spaceId,
        orgId,
        userId,
      );
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

    it('handles empty standard list', async () => {
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

      standardsService.getStandardsBySpace.mockResolvedValue({ standards: [] });

      const result = await controller.getStandards(orgId, spaceId, request);

      expect(result).toEqual({ standards: [] });
      expect(standardsService.getStandardsBySpace).toHaveBeenCalledWith(
        spaceId,
        orgId,
        userId,
      );
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

    it('updates standard successfully', async () => {
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

      standardsService.updateStandard.mockResolvedValue(mockUpdatedStandard);

      const result = await controller.updateStandard(
        orgId,
        spaceId,
        standardId,
        validStandard,
        request,
      );

      expect(result).toEqual(mockUpdatedStandard);
      expect(standardsService.updateStandard).toHaveBeenCalledWith(
        standardId,
        validStandard,
        orgId,
        userId,
        spaceId,
      );
    });

    it('throws BadRequestException if name is missing', async () => {
      const invalidStandard = {
        ...validStandard,
        name: '',
      };

      await expect(
        controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          invalidStandard,
          request,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(standardsService.updateStandard).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if description is missing', async () => {
      const invalidStandard = {
        ...validStandard,
        description: '',
      };

      await expect(
        controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          invalidStandard,
          request,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(standardsService.updateStandard).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if rules is not an array', async () => {
      const invalidStandard = {
        ...validStandard,
        rules: null as unknown as Array<{ id: RuleId; content: string }>,
      };

      await expect(
        controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          invalidStandard,
          request,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(standardsService.updateStandard).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if rule content is missing', async () => {
      const invalidStandard = {
        ...validStandard,
        rules: [
          {
            id: ruleId,
            content: '',
          },
        ],
      };

      await expect(
        controller.updateStandard(
          orgId,
          spaceId,
          standardId,
          invalidStandard,
          request,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(standardsService.updateStandard).not.toHaveBeenCalled();
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

    it('updates standard with null scope', async () => {
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

      standardsService.updateStandard.mockResolvedValue(mockUpdatedStandard);

      const result = await controller.updateStandard(
        orgId,
        spaceId,
        standardId,
        standardWithNullScope,
        request,
      );

      expect(result).toEqual(mockUpdatedStandard);
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
