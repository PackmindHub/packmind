import { CreateDetectionProgramUseCase } from './createDetectionProgram.usecase';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  createStandardId,
  createStandardVersionId,
  ProgrammingLanguage,
  Rule,
  Standard,
  StandardVersion,
  createDetectionProgramId,
  DetectionProgram,
  DetectionModeEnum,
  IStandardsPort,
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  CreateDetectionProgramCommand,
} from '@packmind/types';
import { ruleFactory } from '@packmind/standards/test';
import { DetectionProgramService } from '../../services/DetectionProgramService';
import { stubLogger } from '@packmind/test-utils';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';
import { standardFactory } from '@packmind/standards/test';

// Add at the top, before other imports
jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');
  return {
    ...actual,
    SSEEventPublisher: {
      publishProgramStatusEvent: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('CreateDetectionProgramUseCase', () => {
  let createDetectionProgramUseCase: CreateDetectionProgramUseCase;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock DetectionProgramRepository
    detectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      getLatestVersionByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    // Mock ActiveDetectionProgramRepository
    activeDetectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      deleteByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    standardsAdapter = {
      getStandard: jest.fn(),
      getRule: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      listStandardVersions: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      findStandardBySlug: jest.fn(),
      getLatestStandardVersion: jest.fn(),
    };

    stubbedLogger = stubLogger();

    const detectionProgramService = {
      findActiveByRuleIdAndLanguage:
        activeDetectionProgramRepository.findByRuleIdAndLanguage,
      addDetectionProgram: detectionProgramRepository.add,
      addActiveDetectionProgram: activeDetectionProgramRepository.add,
    } as unknown as DetectionProgramService;

    createDetectionProgramUseCase = new CreateDetectionProgramUseCase(
      detectionProgramService,
      standardsAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when detection program creation succeeds', () => {
      let command: CreateDetectionProgramCommand;
      let existingRule: Rule;
      let existingStandardVersion: StandardVersion;
      let existingStandard: Standard;
      let createdDetectionProgram: DetectionProgram;
      let createdActiveDetectionProgram: ActiveDetectionProgram;
      let result: DetectionProgram;

      beforeEach(async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        command = {
          ruleId,
          code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
        };

        existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        createdDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: command.code,
          version: 1,
          mode: command.mode,
        });

        createdActiveDetectionProgram = activeDetectionProgramFactory({
          id: createActiveDetectionProgramId(uuidv4()),
          detectionProgramVersion: createdDetectionProgram.id,
          ruleId,
          language: command.language,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          createdActiveDetectionProgram,
        );

        result = await createDetectionProgramUseCase.execute(command);
      });

      it('validates rule exists and belongs to organization', () => {
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(command.ruleId);
        expect(standardsAdapter.getStandardVersion).toHaveBeenCalledWith(
          existingRule.standardVersionId,
        );
        expect(standardsAdapter.getStandard).toHaveBeenCalledWith(
          existingStandardVersion.standardId,
        );
      });

      it('creates detection program with version 1', () => {
        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            ruleId: command.ruleId,
            code: command.code,
            version: 1,
            mode: command.mode,
          }),
        );
      });

      it('creates active detection program pointing to created detection program', () => {
        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: createdDetectionProgram.id,
            ruleId: command.ruleId,
            language: command.language,
            detectionProgramDraftVersion: null,
          }),
        );
      });

      it('creates detection program before active detection program', () => {
        const detectionProgramCall =
          detectionProgramRepository.add.mock.invocationCallOrder[0];
        const activeDetectionProgramCall =
          activeDetectionProgramRepository.add.mock.invocationCallOrder[0];
        expect(detectionProgramCall).toBeLessThan(activeDetectionProgramCall);
      });

      it('returns the created detection program', () => {
        expect(result).toEqual(createdDetectionProgram);
      });
    });

    describe('when rule does not exist', () => {
      it('throws an error', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const command: CreateDetectionProgramCommand = {
          ruleId: createRuleId(uuidv4()),
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        standardsAdapter.getRule.mockResolvedValue(null);

        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Rule not found');

        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when rule does not belong to user organization', () => {
      it('throws an error standard version not found', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(null);

        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Standard version not found for rule');

        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
      });

      it('throws an error standard not found', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(null);

        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Standard not found for rule');

        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
      });

      // Note: Organization-level validation was removed as standards are now space-scoped
      // and validation should be done at a higher level (e.g., API layer)
    });

    describe('when existing active detection program exists for same rule and language', () => {
      it('throws an error to prevent overwriting existing detection program', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'new detection code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
        };

        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const existingActiveProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          existingActiveProgram,
        );

        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow(
          'Active detection program already exists for this rule and language',
        );

        expect(
          activeDetectionProgramRepository.findByRuleIdAndLanguage,
        ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.JAVASCRIPT);
        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
      });

      it('allows creating detection program for different language on same rule', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'typescript detection code',
          language: ProgrammingLanguage.TYPESCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
        };

        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          ruleId,
          code: command.code,
          version: 1,
          mode: command.mode,
        });

        const createdActiveProgram = activeDetectionProgramFactory({
          detectionProgramVersion: createdDetectionProgram.id,
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        // No existing active program for TypeScript
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          createdActiveProgram,
        );

        const result = await createDetectionProgramUseCase.execute(command);

        expect(
          activeDetectionProgramRepository.findByRuleIdAndLanguage,
        ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.TYPESCRIPT);
        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            ruleId,
            code: command.code,
            version: 1,
            mode: command.mode,
          }),
        );
        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: createdDetectionProgram.id,
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
          }),
        );
        expect(result).toEqual(createdDetectionProgram);
      });
    });

    describe('with different detection program modes', () => {
      it('creates detection program with REGEXP mode', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: '/Controller$/.test(className)',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          mode: DetectionModeEnum.REGEXP,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: DetectionModeEnum.REGEXP,
          }),
        );
      });

      it('creates detection program with FILE_SYSTEM mode', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'const files = fs.readdirSync(directory);',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.FILE_SYSTEM,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          mode: DetectionModeEnum.FILE_SYSTEM,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: DetectionModeEnum.FILE_SYSTEM,
          }),
        );
      });
    });

    describe('with different programming languages', () => {
      it('creates detection program for TypeScript', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'interface validation code',
          language: ProgrammingLanguage.TYPESCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          detectionProgramFactory(),
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            language: ProgrammingLanguage.TYPESCRIPT,
          }),
        );
      });

      it('creates detection program for Python', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'def validate_naming(node):',
          language: ProgrammingLanguage.PYTHON,
          mode: DetectionModeEnum.SINGLE_AST,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          detectionProgramFactory(),
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            language: ProgrammingLanguage.PYTHON,
          }),
        );
      });
    });

    describe('when detection program creation fails', () => {
      it('throws an error and does not create active detection program', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');

        expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when active detection program creation fails', () => {
      it('throws an error after detection program creation', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory();

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockRejectedValue(
          new Error('Active program creation failed'),
        );

        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Active program creation failed');

        expect(detectionProgramRepository.add).toHaveBeenCalledTimes(1);
        expect(activeDetectionProgramRepository.add).toHaveBeenCalledTimes(1);
      });
    });

    describe('when mustBeDraftVersion is true', () => {
      it('creates active detection program with draft version', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
          mustBeDraftVersion: true,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: command.code,
          version: 1,
          mode: command.mode,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: null,
            ruleId: command.ruleId,
            language: command.language,
            detectionProgramDraftVersion: createdDetectionProgram.id,
          }),
        );
      });
    });

    describe('when mustBeDraftVersion is false', () => {
      it('creates active detection program with regular version (current behavior)', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
          mustBeDraftVersion: false,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: command.code,
          version: 1,
          mode: command.mode,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: createdDetectionProgram.id,
            ruleId: command.ruleId,
            language: command.language,
            detectionProgramDraftVersion: null,
          }),
        );
      });
    });

    describe('command validation', () => {
      it('validates required fields are present', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        // Test missing code
        const commandWithoutCode = {
          ruleId,
          code: '',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          organizationId,
          userId: createUserId(uuidv4()),
        } as CreateDetectionProgramCommand;

        await expect(
          createDetectionProgramUseCase.execute(commandWithoutCode),
        ).rejects.toThrow('Code is required');

        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
      });

      it('validates language is provided', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const commandWithoutLanguage = {
          ruleId,
          code: 'test code',
          language: null,
          mode: DetectionModeEnum.REGEXP,
          organizationId,
          userId: createUserId(uuidv4()),
        } as unknown as CreateDetectionProgramCommand;

        await expect(
          createDetectionProgramUseCase.execute(commandWithoutLanguage),
        ).rejects.toThrow('Language is required');

        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
      });
    });
  });
});
