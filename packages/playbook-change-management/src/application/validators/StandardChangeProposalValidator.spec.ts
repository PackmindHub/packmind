import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  CreateChangeProposalCommand,
  createRuleId,
  createStandardId,
  createOrganizationId,
  createUserId,
  IStandardsPort,
  Standard,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { StandardChangeProposalValidator } from './StandardChangeProposalValidator';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';

describe('StandardChangeProposalValidator', () => {
  const standardId = createStandardId('standard-1');
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');

  const standard: Standard = {
    id: standardId,
    spaceId: 'space-1' as never,
    userId,
    name: 'My Standard',
    slug: 'my-standard',
    version: 3,
    description: 'A standard description',
    scope: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let validator: StandardChangeProposalValidator;
  let standardsPort: jest.Mocked<IStandardsPort>;

  const buildCommand = (
    overrides: Partial<CreateChangeProposalCommand<ChangeProposalType>> = {},
  ) =>
    ({
      userId,
      organizationId,
      spaceId: 'space-1',
      type: ChangeProposalType.updateStandardName,
      artefactId: standardId,
      captureMode: ChangeProposalCaptureMode.commit,
      payload: {
        oldValue: 'My Standard',
        newValue: 'Renamed Standard',
      },
      ...overrides,
    }) as CreateChangeProposalCommand<ChangeProposalType> & MemberContext;

  beforeEach(() => {
    standardsPort = {
      getStandard: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      getLatestStandardVersion: jest.fn(),
      listStandardsBySpace: jest.fn(),
      findStandardBySlug: jest.fn(),
      getRulesByStandardId: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRule: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      listStandardVersions: jest.fn(),
      createStandardWithExamples: jest.fn(),
      createStandardSamples: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    validator = new StandardChangeProposalValidator(standardsPort);

    standardsPort.getStandard.mockResolvedValue(standard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('supports', () => {
    it('returns true for updateStandardName', () => {
      expect(validator.supports(ChangeProposalType.updateStandardName)).toBe(
        true,
      );
    });

    it('returns true for updateStandardDescription', () => {
      expect(
        validator.supports(ChangeProposalType.updateStandardDescription),
      ).toBe(true);
    });

    it('returns true for updateStandardScope', () => {
      expect(validator.supports(ChangeProposalType.updateStandardScope)).toBe(
        true,
      );
    });

    it('returns true for addRule', () => {
      expect(validator.supports(ChangeProposalType.addRule)).toBe(true);
    });

    it('returns true for deleteRule', () => {
      expect(validator.supports(ChangeProposalType.deleteRule)).toBe(true);
    });

    it('returns false for updateCommandDescription', () => {
      expect(
        validator.supports(ChangeProposalType.updateCommandDescription),
      ).toBe(false);
    });

    it('returns false for updateSkillName', () => {
      expect(validator.supports(ChangeProposalType.updateSkillName)).toBe(
        false,
      );
    });
  });

  describe('when validating updateStandardName', () => {
    describe('when oldValue matches standard name', () => {
      it('validates successfully and returns artefactVersion', async () => {
        const result = await validator.validate(buildCommand());

        expect(result).toEqual({ artefactVersion: 3 });
      });
    });

    describe('when oldValue does not match standard name', () => {
      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          payload: {
            oldValue: 'Wrong Name',
            newValue: 'New Name',
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });
  });

  describe('when validating updateStandardDescription', () => {
    describe('when oldValue matches standard description', () => {
      it('validates successfully and returns artefactVersion', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'A standard description',
            newValue: 'Updated description',
          },
        });

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 3 });
      });
    });

    describe('when oldValue does not match standard description', () => {
      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'Wrong description',
            newValue: 'Updated description',
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });
  });

  describe('when validating updateStandardScope', () => {
    describe('when standard has a scope and oldValue matches', () => {
      beforeEach(() => {
        standardsPort.getStandard.mockResolvedValue({
          ...standard,
          scope: '**/*.ts',
        });
      });

      it('validates successfully and returns artefactVersion', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateStandardScope,
          payload: {
            oldValue: '**/*.ts',
            newValue: '**/*.tsx',
          },
        });

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 3 });
      });
    });

    describe('when standard has null scope and oldValue is empty', () => {
      it('validates successfully and returns artefactVersion', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateStandardScope,
          payload: {
            oldValue: '',
            newValue: '**/*.ts',
          },
        });

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 3 });
      });
    });

    describe('when oldValue does not match standard scope', () => {
      beforeEach(() => {
        standardsPort.getStandard.mockResolvedValue({
          ...standard,
          scope: '**/*.ts',
        });
      });

      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateStandardScope,
          payload: {
            oldValue: 'wrong-scope',
            newValue: '**/*.tsx',
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });
  });

  describe('when validating addRule', () => {
    it('validates successfully and returns artefactVersion', async () => {
      const ruleId = createRuleId();
      const command = buildCommand({
        type: ChangeProposalType.addRule,
        payload: {
          targetId: ruleId,
          item: { id: ruleId, content: 'New rule content' },
        },
      });

      const result = await validator.validate(command);

      expect(result).toEqual({ artefactVersion: 3 });
    });
  });

  describe('when validating deleteRule', () => {
    const ruleId = createRuleId();
    const realRuleId = createRuleId('real-rule-id');

    describe('when rule content exists in standard', () => {
      beforeEach(() => {
        standardsPort.getRulesByStandardId.mockResolvedValue([
          {
            id: realRuleId,
            content: 'Existing rule',
            standardVersionId: 'sv-1' as never,
          },
        ]);
      });

      it('validates successfully and returns artefactVersion', async () => {
        const command = buildCommand({
          type: ChangeProposalType.deleteRule,
          payload: {
            targetId: ruleId,
            item: { id: ruleId, content: 'Existing rule' },
          },
        });

        const result = await validator.validate(command);

        expect(result.artefactVersion).toEqual(3);
      });

      it('returns resolvedPayload with real rule ID', async () => {
        const command = buildCommand({
          type: ChangeProposalType.deleteRule,
          payload: {
            targetId: ruleId,
            item: { id: ruleId, content: 'Existing rule' },
          },
        });

        const result = await validator.validate(command);

        expect(result.resolvedPayload).toEqual({
          targetId: realRuleId,
          item: { id: realRuleId, content: 'Existing rule' },
        });
      });
    });

    describe('when rule content does not exist in standard', () => {
      beforeEach(() => {
        standardsPort.getRulesByStandardId.mockResolvedValue([
          {
            id: createRuleId(),
            content: 'Different rule',
            standardVersionId: 'sv-1' as never,
          },
        ]);
      });

      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          type: ChangeProposalType.deleteRule,
          payload: {
            targetId: ruleId,
            item: { id: ruleId, content: 'Non-existent rule' },
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });

    describe('when standard has no rules', () => {
      beforeEach(() => {
        standardsPort.getRulesByStandardId.mockResolvedValue([]);
      });

      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          type: ChangeProposalType.deleteRule,
          payload: {
            targetId: ruleId,
            item: { id: ruleId, content: 'Some rule' },
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });
  });

  describe('when standard not found', () => {
    beforeEach(() => {
      standardsPort.getStandard.mockResolvedValue(null);
    });

    it('throws error', async () => {
      await expect(validator.validate(buildCommand())).rejects.toThrow(
        `Standard ${standardId} not found`,
      );
    });
  });
});
