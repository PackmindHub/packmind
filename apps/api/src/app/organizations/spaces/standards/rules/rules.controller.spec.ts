import { NotFoundException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  createStandardId,
  createStandardVersionId,
  createRuleId,
  Rule,
  Standard,
} from '@packmind/types';
import { RulesService } from '../../../../standards/rules/rules.service';
import { StandardsService } from '../../../../standards/standards.service';
import { OrganizationsSpacesStandardsRulesController } from './rules.controller';

describe('OrganizationsSpacesStandardsRulesController', () => {
  let controller: OrganizationsSpacesStandardsRulesController;
  let rulesService: jest.Mocked<RulesService>;
  let standardsService: jest.Mocked<StandardsService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    rulesService = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<RulesService>;

    standardsService = {
      getStandardById: jest.fn(),
    } as unknown as jest.Mocked<StandardsService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesStandardsRulesController(
      rulesService,
      standardsService,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRulesByStandardId', () => {
    describe('when validation passes', () => {
      it('returns rules for standard within space', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const standardId = createStandardId('standard-789');
        const userId = createUserId('user-1');

        const mockStandard: Standard = {
          id: standardId,
          slug: 'test-standard',
          name: 'Test Standard',
          description: 'Test description',
          userId,
          version: 1,
          spaceId,
          scope: null,
        };

        const mockRules: Rule[] = [
          {
            id: createRuleId('rule-1'),
            content: 'Test rule 1',
            standardVersionId: createStandardVersionId('version-1'),
          },
          {
            id: createRuleId('rule-2'),
            content: 'Test rule 2',
            standardVersionId: createStandardVersionId('version-1'),
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

        standardsService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRulesByStandardId.mockResolvedValue(mockRules);

        const result = await controller.getRulesByStandardId(
          orgId,
          spaceId,
          standardId,
          request,
        );

        expect(result).toEqual(mockRules);
        expect(standardsService.getStandardById).toHaveBeenCalledWith(
          standardId,
          orgId,
          spaceId,
          userId,
        );
        expect(rulesService.getRulesByStandardId).toHaveBeenCalledWith(
          standardId,
        );
      });
    });

    describe('when standard does not exist', () => {
      it('throws NotFoundException', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const standardId = createStandardId('standard-789');
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

        standardsService.getStandardById.mockResolvedValue({
          standard: null as unknown as Standard,
        });

        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(NotFoundException);
        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(
          `Standard ${standardId} not found in space ${spaceId}`,
        );

        expect(rulesService.getRulesByStandardId).not.toHaveBeenCalled();
      });
    });

    describe('when standard belongs to different space', () => {
      it('throws NotFoundException', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const differentSpaceId = createSpaceId('space-999');
        const standardId = createStandardId('standard-789');
        const userId = createUserId('user-1');

        const mockStandard: Standard = {
          id: standardId,
          slug: 'test-standard',
          name: 'Test Standard',
          description: 'Test description',
          userId,
          version: 1,
          spaceId: differentSpaceId, // Different space!
          scope: null,
        };

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

        standardsService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });

        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(NotFoundException);
        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );

        expect(rulesService.getRulesByStandardId).not.toHaveBeenCalled();
      });
    });

    describe('when standard has no rules', () => {
      it('returns empty array', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const standardId = createStandardId('standard-789');
        const userId = createUserId('user-1');

        const mockStandard: Standard = {
          id: standardId,
          slug: 'test-standard',
          name: 'Test Standard',
          description: 'Test description',
          userId,
          version: 1,
          spaceId,
          scope: null,
        };

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

        standardsService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRulesByStandardId.mockResolvedValue([]);

        const result = await controller.getRulesByStandardId(
          orgId,
          spaceId,
          standardId,
          request,
        );

        expect(result).toEqual([]);
        expect(rulesService.getRulesByStandardId).toHaveBeenCalledWith(
          standardId,
        );
      });
    });

    it('propagates errors from standardsService', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const standardId = createStandardId('standard-789');
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

      const error = new Error('Database error');
      standardsService.getStandardById.mockRejectedValue(error);

      await expect(
        controller.getRulesByStandardId(orgId, spaceId, standardId, request),
      ).rejects.toThrow('Database error');

      expect(rulesService.getRulesByStandardId).not.toHaveBeenCalled();
    });

    it('propagates errors from rulesService', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const standardId = createStandardId('standard-789');
      const userId = createUserId('user-1');

      const mockStandard: Standard = {
        id: standardId,
        slug: 'test-standard',
        name: 'Test Standard',
        description: 'Test description',
        userId,
        version: 1,
        spaceId,
        scope: null,
      };

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

      standardsService.getStandardById.mockResolvedValue({
        standard: mockStandard,
      });

      const error = new Error('Rules fetch error');
      rulesService.getRulesByStandardId.mockRejectedValue(error);

      await expect(
        controller.getRulesByStandardId(orgId, spaceId, standardId, request),
      ).rejects.toThrow('Rules fetch error');
    });
  });
});
