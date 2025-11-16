import { PatchApplicationService } from './PatchApplicationService';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  IStandardsPort,
  IRecipesPort,
  KnowledgePatchType,
  createStandardId,
  createRuleId,
  createOrganizationId,
  StandardVersion,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { knowledgePatchFactory } from '../../../test/knowledgePatchFactory';
import { standardFactory } from '@packmind/standards/test';

describe('PatchApplicationService', () => {
  let patchApplicationService: PatchApplicationService;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardsPort = {
      getStandard: jest.fn(),
      addRuleToStandard: jest.fn(),
      updateStandardRules: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {} as jest.Mocked<IRecipesPort>;

    stubbedLogger = stubLogger();

    patchApplicationService = new PatchApplicationService(
      standardsPort,
      recipesPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applyPatch - UPDATE_STANDARD with addRule action', () => {
    it('adds new rule to standard successfully', async () => {
      const standardId = createStandardId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const userId = 'user-123';

      const standard = standardFactory({
        id: standardId,
        slug: 'test-standard',
      });

      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.UPDATE_STANDARD,
        proposedChanges: {
          standardId: standardId,
          action: 'addRule',
          targetRuleId: null,
          content: 'New rule content',
          rationale: 'Adding new rule',
        },
      });

      standardsPort.getStandard.mockResolvedValue(standard);
      standardsPort.addRuleToStandard.mockResolvedValue({} as StandardVersion);

      const result = await patchApplicationService.applyPatch(
        patch,
        organizationId,
        userId,
      );

      expect(result).toBe(true);
      expect(standardsPort.getStandard).toHaveBeenCalledWith(standardId);
      expect(standardsPort.addRuleToStandard).toHaveBeenCalledWith({
        standardSlug: 'test-standard',
        ruleContent: 'New rule content',
        organizationId,
        userId,
      });
    });
  });

  describe('applyPatch - UPDATE_STANDARD with updateRule action', () => {
    it('updates existing rule in standard successfully', async () => {
      const standardId = createStandardId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const userId = 'user-123';

      const standard = standardFactory({
        id: standardId,
        slug: 'test-standard',
      });

      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.UPDATE_STANDARD,
        proposedChanges: {
          standardId: standardId,
          action: 'updateRule',
          targetRuleId: ruleId,
          content: 'Updated rule content',
          rationale: 'Updating existing rule',
        },
      });

      standardsPort.getStandard.mockResolvedValue(standard);
      standardsPort.updateStandardRules.mockResolvedValue(
        {} as StandardVersion,
      );

      const result = await patchApplicationService.applyPatch(
        patch,
        organizationId,
        userId,
      );

      expect(result).toBe(true);
      expect(standardsPort.getStandard).toHaveBeenCalledWith(standardId);
      expect(standardsPort.updateStandardRules).toHaveBeenCalledWith({
        standardId,
        ruleId,
        newRuleContent: 'Updated rule content',
        organizationId,
        userId,
      });
    });

    it('throws error when targetRuleId is missing for updateRule action', async () => {
      const standardId = createStandardId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());

      const standard = standardFactory({ id: standardId });

      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.UPDATE_STANDARD,
        proposedChanges: {
          standardId: standardId,
          action: 'updateRule',
          targetRuleId: null,
          content: 'Content',
          rationale: 'Rationale',
        },
      });

      standardsPort.getStandard.mockResolvedValue(standard);

      await expect(
        patchApplicationService.applyPatch(patch, organizationId, 'user-123'),
      ).rejects.toThrow('targetRuleId is required for updateRule action');
    });
  });

  describe('applyPatch - errors', () => {
    it('throws error when standard not found', async () => {
      const standardId = createStandardId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());

      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.UPDATE_STANDARD,
        proposedChanges: {
          standardId: standardId,
          action: 'addRule',
          targetRuleId: null,
          content: 'Content',
          rationale: 'Rationale',
        },
      });

      standardsPort.getStandard.mockResolvedValue(null);

      await expect(
        patchApplicationService.applyPatch(patch, organizationId, 'user-123'),
      ).rejects.toThrow(`Standard ${standardId} not found`);
    });

    it('throws error when standardsPort is not available', async () => {
      const serviceWithoutPort = new PatchApplicationService(
        null,
        null,
        stubbedLogger,
      );

      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.UPDATE_STANDARD,
        proposedChanges: {},
      });

      await expect(
        serviceWithoutPort.applyPatch(
          patch,
          createOrganizationId(uuidv4()),
          'user-123',
        ),
      ).rejects.toThrow('StandardsPort not available for applying patch');
    });
  });

  describe('applyPatch - unsupported patch types', () => {
    it('returns false for NEW_STANDARD patch type', async () => {
      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.NEW_STANDARD,
      });

      const result = await patchApplicationService.applyPatch(
        patch,
        createOrganizationId(uuidv4()),
        'user-123',
      );

      expect(result).toBe(false);
    });

    it('returns false for UPDATE_RECIPE patch type', async () => {
      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.UPDATE_RECIPE,
      });

      const result = await patchApplicationService.applyPatch(
        patch,
        createOrganizationId(uuidv4()),
        'user-123',
      );

      expect(result).toBe(false);
    });
  });
});
