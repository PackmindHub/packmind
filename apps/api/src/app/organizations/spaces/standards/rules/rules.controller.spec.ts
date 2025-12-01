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
  createRuleExampleId,
  Rule,
  RuleExample,
  Standard,
  ProgrammingLanguage,
} from '@packmind/types';
import { RulesService } from './rules.service';
import { OrganizationsSpacesStandardsRulesController } from './rules.controller';

describe('OrganizationsSpacesStandardsRulesController', () => {
  let controller: OrganizationsSpacesStandardsRulesController;
  let rulesService: jest.Mocked<RulesService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    rulesService = {
      getStandardById: jest.fn(),
      getRulesByStandardId: jest.fn(),
      getRuleExamples: jest.fn(),
    } as unknown as jest.Mocked<RulesService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesStandardsRulesController(
      rulesService,
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

        rulesService.getStandardById.mockResolvedValue({
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
        expect(rulesService.getStandardById).toHaveBeenCalledWith(
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

        rulesService.getStandardById.mockResolvedValue({
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

        rulesService.getStandardById.mockResolvedValue({
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

        rulesService.getStandardById.mockResolvedValue({
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
      rulesService.getStandardById.mockRejectedValue(error);

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

      rulesService.getStandardById.mockResolvedValue({
        standard: mockStandard,
      });

      const error = new Error('Rules fetch error');
      rulesService.getRulesByStandardId.mockRejectedValue(error);

      await expect(
        controller.getRulesByStandardId(orgId, spaceId, standardId, request),
      ).rejects.toThrow('Rules fetch error');
    });
  });

  describe('getRuleExamples', () => {
    describe('when validation passes', () => {
      it('returns rule examples for a rule within a standard', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const standardId = createStandardId('standard-789');
        const ruleId = createRuleId('rule-1');
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

        const mockRuleExamples: RuleExample[] = [
          {
            id: createRuleExampleId('example-1'),
            ruleId,
            lang: ProgrammingLanguage.TYPESCRIPT,
            positive: 'const x = 1;',
            negative: 'var x = 1;',
          },
          {
            id: createRuleExampleId('example-2'),
            ruleId,
            lang: ProgrammingLanguage.JAVASCRIPT,
            positive: 'const y = 2;',
            negative: 'var y = 2;',
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

        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRuleExamples.mockResolvedValue(mockRuleExamples);

        const result = await controller.getRuleExamples(
          orgId,
          spaceId,
          standardId,
          ruleId,
          request,
        );

        expect(result).toEqual(mockRuleExamples);
        expect(rulesService.getStandardById).toHaveBeenCalledWith(
          standardId,
          orgId,
          spaceId,
          userId,
        );
        expect(rulesService.getRuleExamples).toHaveBeenCalledWith({
          userId,
          organizationId: orgId,
          ruleId,
        });
      });
    });

    describe('when standard does not exist', () => {
      it('throws NotFoundException', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const standardId = createStandardId('standard-789');
        const ruleId = createRuleId('rule-1');
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

        rulesService.getStandardById.mockResolvedValue({
          standard: null as unknown as Standard,
        });

        await expect(
          controller.getRuleExamples(
            orgId,
            spaceId,
            standardId,
            ruleId,
            request,
          ),
        ).rejects.toThrow(NotFoundException);
        await expect(
          controller.getRuleExamples(
            orgId,
            spaceId,
            standardId,
            ruleId,
            request,
          ),
        ).rejects.toThrow(
          `Standard with ID ${standardId} not found in organization ${orgId} and space ${spaceId}`,
        );

        expect(rulesService.getRuleExamples).not.toHaveBeenCalled();
      });
    });

    describe('when standard belongs to different space', () => {
      it('throws NotFoundException', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const differentSpaceId = createSpaceId('space-999');
        const standardId = createStandardId('standard-789');
        const ruleId = createRuleId('rule-1');
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

        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });

        await expect(
          controller.getRuleExamples(
            orgId,
            spaceId,
            standardId,
            ruleId,
            request,
          ),
        ).rejects.toThrow(NotFoundException);
        await expect(
          controller.getRuleExamples(
            orgId,
            spaceId,
            standardId,
            ruleId,
            request,
          ),
        ).rejects.toThrow(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );

        expect(rulesService.getRuleExamples).not.toHaveBeenCalled();
      });
    });

    describe('when rule has no examples', () => {
      it('returns empty array', async () => {
        const orgId = createOrganizationId('org-123');
        const spaceId = createSpaceId('space-456');
        const standardId = createStandardId('standard-789');
        const ruleId = createRuleId('rule-1');
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

        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRuleExamples.mockResolvedValue([]);

        const result = await controller.getRuleExamples(
          orgId,
          spaceId,
          standardId,
          ruleId,
          request,
        );

        expect(result).toEqual([]);
        expect(rulesService.getRuleExamples).toHaveBeenCalledWith({
          userId,
          organizationId: orgId,
          ruleId,
        });
      });
    });

    it('propagates errors from rulesService', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const standardId = createStandardId('standard-789');
      const ruleId = createRuleId('rule-1');
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

      rulesService.getStandardById.mockResolvedValue({
        standard: mockStandard,
      });

      const error = new Error('Failed to fetch examples');
      rulesService.getRuleExamples.mockRejectedValue(error);

      await expect(
        controller.getRuleExamples(orgId, spaceId, standardId, ruleId, request),
      ).rejects.toThrow('Failed to fetch examples');
    });
  });
});
