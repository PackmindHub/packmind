import { GetDetectionProgramsForPackagesUseCase } from './getDetectionProgramsForPackages.usecase';
import { DetectionProgramService } from '../../services/DetectionProgramService';
import { ruleFactory, standardFactory } from '@packmind/standards/test';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createRuleId,
  createSpaceId,
  createUserId,
  IDeploymentPort,
  ISpacesPort,
  IStandardsPort,
  GetDetectionProgramsForPackagesCommand,
  ProgrammingLanguage,
  createActiveDetectionProgramId,
  createDetectionProgramId,
  DetectionModeEnum,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';

describe('GetDetectionProgramsForPackagesUseCase', () => {
  let useCase: GetDetectionProgramsForPackagesUseCase;
  let detectionProgramService: jest.Mocked<DetectionProgramService>;
  let deploymentsAdapter: jest.Mocked<IDeploymentPort>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let spacesAdapter: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    detectionProgramService = {
      findActiveByRuleIdWithPrograms: jest.fn(),
    } as unknown as jest.Mocked<DetectionProgramService>;

    deploymentsAdapter = {
      getPackageSummary: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    standardsAdapter = {
      getRule: jest.fn(),
      getStandard: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      listStandardVersions: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      findStandardBySlug: jest.fn(),
      getLatestStandardVersion: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    spacesAdapter = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    useCase = new GetDetectionProgramsForPackagesUseCase(
      detectionProgramService,
      deploymentsAdapter,
      standardsAdapter,
      spacesAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scope parsing', () => {
    const organizationId = createOrganizationId(uuidv4());
    const userId = createUserId(uuidv4());
    const spaceId = createSpaceId(uuidv4());
    const ruleId = createRuleId(uuidv4());

    const setupMocksForScopeTest = (scope: string | null) => {
      const standard = standardFactory({
        name: 'Test Standard',
        slug: 'test-standard',
        scope,
        spaceId,
      });

      const rule = ruleFactory({ id: ruleId });

      const detectionProgram = detectionProgramFactory({
        id: createDetectionProgramId(uuidv4()),
        ruleId,
        code: 'test code',
        version: 1,
        mode: DetectionModeEnum.SINGLE_AST,
        language: ProgrammingLanguage.TYPESCRIPT,
      });

      const activeDetectionProgram = activeDetectionProgramFactory({
        id: createActiveDetectionProgramId(uuidv4()),
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        detectionProgramVersion: detectionProgram.id,
      });

      spacesAdapter.listSpacesByOrganization.mockResolvedValue([
        { id: spaceId, name: 'Test Space' } as never,
      ]);

      standardsAdapter.listStandardsBySpace.mockResolvedValue([standard]);
      standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([rule]);

      deploymentsAdapter.getPackageSummary.mockResolvedValue({
        name: 'test-package',
        slug: 'test-package',
        standards: [{ name: 'Test Standard' }],
      } as never);

      detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue([
        {
          ...activeDetectionProgram,
          detectionProgram,
          draftDetectionProgram: null,
        },
      ]);

      return { standard };
    };

    describe('with single scope value', () => {
      it('returns scope as single-element array', async () => {
        setupMocksForScopeTest('**/*.spec.ts');

        const command: GetDetectionProgramsForPackagesCommand = {
          packagesSlugs: ['test-package'],
          organizationId,
          userId,
        };

        const result = await useCase.execute(command);

        expect(result.targets[0].standards[0].scope).toEqual(['**/*.spec.ts']);
      });
    });

    describe('with comma-separated scope values', () => {
      it('splits and trims values into array', async () => {
        setupMocksForScopeTest('**/*.spec.ts, **/*.test.ts');

        const command: GetDetectionProgramsForPackagesCommand = {
          packagesSlugs: ['test-package'],
          organizationId,
          userId,
        };

        const result = await useCase.execute(command);

        expect(result.targets[0].standards[0].scope).toEqual([
          '**/*.spec.ts',
          '**/*.test.ts',
        ]);
      });
    });

    describe('with multiple comma-separated values', () => {
      it('handles three or more values correctly', async () => {
        setupMocksForScopeTest('**/*.spec.ts, **/*.test.ts, **/*.e2e.ts');

        const command: GetDetectionProgramsForPackagesCommand = {
          packagesSlugs: ['test-package'],
          organizationId,
          userId,
        };

        const result = await useCase.execute(command);

        expect(result.targets[0].standards[0].scope).toEqual([
          '**/*.spec.ts',
          '**/*.test.ts',
          '**/*.e2e.ts',
        ]);
      });
    });

    describe('with values containing extra whitespace', () => {
      it('trims whitespace from each value', async () => {
        setupMocksForScopeTest('  **/*.spec.ts  ,   **/*.test.ts  ');

        const command: GetDetectionProgramsForPackagesCommand = {
          packagesSlugs: ['test-package'],
          organizationId,
          userId,
        };

        const result = await useCase.execute(command);

        expect(result.targets[0].standards[0].scope).toEqual([
          '**/*.spec.ts',
          '**/*.test.ts',
        ]);
      });
    });

    describe('with empty string values after split', () => {
      it('filters out empty values', async () => {
        setupMocksForScopeTest('**/*.spec.ts, , **/*.test.ts');

        const command: GetDetectionProgramsForPackagesCommand = {
          packagesSlugs: ['test-package'],
          organizationId,
          userId,
        };

        const result = await useCase.execute(command);

        expect(result.targets[0].standards[0].scope).toEqual([
          '**/*.spec.ts',
          '**/*.test.ts',
        ]);
      });
    });

    describe('with null scope', () => {
      it('returns empty array', async () => {
        setupMocksForScopeTest(null);

        const command: GetDetectionProgramsForPackagesCommand = {
          packagesSlugs: ['test-package'],
          organizationId,
          userId,
        };

        const result = await useCase.execute(command);

        expect(result.targets[0].standards[0].scope).toEqual([]);
      });
    });

    describe('with empty string scope', () => {
      it('returns empty array', async () => {
        setupMocksForScopeTest('');

        const command: GetDetectionProgramsForPackagesCommand = {
          packagesSlugs: ['test-package'],
          organizationId,
          userId,
        };

        const result = await useCase.execute(command);

        expect(result.targets[0].standards[0].scope).toEqual([]);
      });
    });
  });
});
