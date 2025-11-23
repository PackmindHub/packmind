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

  describe('applyPatch - UPDATE_STANDARD with rules.toAdd', () => {
    it('adds new rules to standard successfully', async () => {
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
          rules: {
            toKeep: [],
            toUpdate: [],
            toDelete: [],
            toAdd: [
              { content: 'New rule content 1' },
              { content: 'New rule content 2' },
            ],
          },
          rationale: 'Adding new rules',
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
      expect(standardsPort.addRuleToStandard).toHaveBeenCalledTimes(2);
      expect(standardsPort.addRuleToStandard).toHaveBeenCalledWith({
        standardSlug: 'test-standard',
        ruleContent: 'New rule content 1',
        organizationId,
        userId,
      });
      expect(standardsPort.addRuleToStandard).toHaveBeenCalledWith({
        standardSlug: 'test-standard',
        ruleContent: 'New rule content 2',
        organizationId,
        userId,
      });
    });
  });

  describe('applyPatch - UPDATE_STANDARD with rules.toUpdate', () => {
    it('updates existing rules in standard successfully', async () => {
      const standardId = createStandardId(uuidv4());
      const ruleId1 = createRuleId(uuidv4());
      const ruleId2 = createRuleId(uuidv4());
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
          rules: {
            toKeep: [],
            toUpdate: [
              { ruleId: ruleId1, newContent: 'Updated rule content 1' },
              { ruleId: ruleId2, newContent: 'Updated rule content 2' },
            ],
            toDelete: [],
            toAdd: [],
          },
          rationale: 'Updating existing rules',
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
      expect(standardsPort.updateStandardRules).toHaveBeenCalledTimes(2);
      expect(standardsPort.updateStandardRules).toHaveBeenCalledWith({
        standardId,
        ruleId: ruleId1,
        newRuleContent: 'Updated rule content 1',
        organizationId,
        userId,
      });
      expect(standardsPort.updateStandardRules).toHaveBeenCalledWith({
        standardId,
        ruleId: ruleId2,
        newRuleContent: 'Updated rule content 2',
        organizationId,
        userId,
      });
    });
  });

  describe('applyPatch - errors', () => {
    it('throws error if standard not found', async () => {
      const standardId = createStandardId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());

      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.UPDATE_STANDARD,
        proposedChanges: {
          standardId: standardId,
          rules: {
            toKeep: [],
            toUpdate: [],
            toDelete: [],
            toAdd: [{ content: 'New rule' }],
          },
          rationale: 'Rationale',
        },
      });

      standardsPort.getStandard.mockResolvedValue(null);

      await expect(
        patchApplicationService.applyPatch(patch, organizationId, 'user-123'),
      ).rejects.toThrow(`Standard ${standardId} not found`);
    });

    it('throws error if standardsPort is not available', async () => {
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

  describe('applyPatch - not yet implemented patch types', () => {
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

    it('returns false for NEW_RECIPE patch type', async () => {
      const patch = knowledgePatchFactory({
        patchType: KnowledgePatchType.NEW_RECIPE,
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
