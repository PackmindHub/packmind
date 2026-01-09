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

      let result: Rule[];

      beforeEach(async () => {
        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRulesByStandardId.mockResolvedValue(mockRules);
        result = await controller.getRulesByStandardId(
          orgId,
          spaceId,
          standardId,
          request,
        );
      });

      it('returns rules for standard', () => {
        expect(result).toEqual(mockRules);
      });

      it('calls getStandardById with correct params', () => {
        expect(rulesService.getStandardById).toHaveBeenCalledWith(
          standardId,
          orgId,
          spaceId,
          userId,
        );
      });

      it('calls getRulesByStandardId with correct params', () => {
        expect(rulesService.getRulesByStandardId).toHaveBeenCalledWith(
          standardId,
        );
      });
    });

    describe('when standard does not exist', () => {
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

      beforeEach(() => {
        rulesService.getStandardById.mockResolvedValue({
          standard: null as unknown as Standard,
        });
      });

      it('throws NotFoundException', async () => {
        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(NotFoundException);
      });

      it('includes descriptive error message', async () => {
        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(
          `Standard ${standardId} not found in space ${spaceId}`,
        );
      });

      it('does not call getRulesByStandardId', async () => {
        await controller
          .getRulesByStandardId(orgId, spaceId, standardId, request)
          .catch(() => {
            /* expected */
          });
        expect(rulesService.getRulesByStandardId).not.toHaveBeenCalled();
      });
    });

    describe('when standard belongs to different space', () => {
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

      beforeEach(() => {
        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
      });

      it('throws NotFoundException', async () => {
        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(NotFoundException);
      });

      it('includes descriptive error message', async () => {
        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow(
          `Standard ${standardId} does not belong to space ${spaceId}`,
        );
      });

      it('does not call getRulesByStandardId', async () => {
        await controller
          .getRulesByStandardId(orgId, spaceId, standardId, request)
          .catch(() => {
            /* expected */
          });
        expect(rulesService.getRulesByStandardId).not.toHaveBeenCalled();
      });
    });

    describe('when standard has no rules', () => {
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

      let result: Rule[];

      beforeEach(async () => {
        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRulesByStandardId.mockResolvedValue([]);
        result = await controller.getRulesByStandardId(
          orgId,
          spaceId,
          standardId,
          request,
        );
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls getRulesByStandardId with correct params', () => {
        expect(rulesService.getRulesByStandardId).toHaveBeenCalledWith(
          standardId,
        );
      });
    });

    describe('when standardsService throws error', () => {
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

      beforeEach(() => {
        const error = new Error('Database error');
        rulesService.getStandardById.mockRejectedValue(error);
      });

      it('propagates the error', async () => {
        await expect(
          controller.getRulesByStandardId(orgId, spaceId, standardId, request),
        ).rejects.toThrow('Database error');
      });

      it('does not call getRulesByStandardId', async () => {
        await controller
          .getRulesByStandardId(orgId, spaceId, standardId, request)
          .catch(() => {
            /* expected */
          });
        expect(rulesService.getRulesByStandardId).not.toHaveBeenCalled();
      });
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

      let result: RuleExample[];

      beforeEach(async () => {
        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRuleExamples.mockResolvedValue(mockRuleExamples);
        result = await controller.getRuleExamples(
          orgId,
          spaceId,
          standardId,
          ruleId,
          request,
        );
      });

      it('returns rule examples', () => {
        expect(result).toEqual(mockRuleExamples);
      });

      it('calls getStandardById with correct params', () => {
        expect(rulesService.getStandardById).toHaveBeenCalledWith(
          standardId,
          orgId,
          spaceId,
          userId,
        );
      });

      it('calls getRuleExamples with correct params', () => {
        expect(rulesService.getRuleExamples).toHaveBeenCalledWith({
          userId,
          organizationId: orgId,
          ruleId,
        });
      });
    });

    describe('when standard does not exist', () => {
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

      beforeEach(() => {
        rulesService.getStandardById.mockResolvedValue({
          standard: null as unknown as Standard,
        });
      });

      it('throws NotFoundException', async () => {
        await expect(
          controller.getRuleExamples(
            orgId,
            spaceId,
            standardId,
            ruleId,
            request,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('includes descriptive error message', async () => {
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
      });

      it('does not call getRuleExamples', async () => {
        await controller
          .getRuleExamples(orgId, spaceId, standardId, ruleId, request)
          .catch(() => {
            /* expected */
          });
        expect(rulesService.getRuleExamples).not.toHaveBeenCalled();
      });
    });

    describe('when standard belongs to different space', () => {
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

      beforeEach(() => {
        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
      });

      it('throws NotFoundException', async () => {
        await expect(
          controller.getRuleExamples(
            orgId,
            spaceId,
            standardId,
            ruleId,
            request,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('includes descriptive error message', async () => {
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
      });

      it('does not call getRuleExamples', async () => {
        await controller
          .getRuleExamples(orgId, spaceId, standardId, ruleId, request)
          .catch(() => {
            /* expected */
          });
        expect(rulesService.getRuleExamples).not.toHaveBeenCalled();
      });
    });

    describe('when rule has no examples', () => {
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

      let result: RuleExample[];

      beforeEach(async () => {
        rulesService.getStandardById.mockResolvedValue({
          standard: mockStandard,
        });
        rulesService.getRuleExamples.mockResolvedValue([]);
        result = await controller.getRuleExamples(
          orgId,
          spaceId,
          standardId,
          ruleId,
          request,
        );
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls getRuleExamples with correct params', () => {
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
