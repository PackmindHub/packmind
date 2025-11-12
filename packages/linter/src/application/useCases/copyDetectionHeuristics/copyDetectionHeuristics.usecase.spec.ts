import { createOrganizationId, createUserId } from '@packmind/types';
import { createRuleId, ProgrammingLanguage } from '@packmind/types';
import { CopyDetectionHeuristicsUseCase } from './copyDetectionHeuristics.usecase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IRuleDetectionHeuristicsRepository } from '../../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { detectionHeuristicsFactory } from '../../../../test/detectionHeuristicsFactory';
import { v4 as uuidv4 } from 'uuid';

describe('CopyDetectionHeuristicsUseCase', () => {
  let useCase: CopyDetectionHeuristicsUseCase;
  let repositories: jest.Mocked<ILinterRepositories>;
  let heuristicsRepository: jest.Mocked<IRuleDetectionHeuristicsRepository>;

  const oldRuleId = createRuleId(uuidv4());
  const newRuleId = createRuleId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());

  beforeEach(() => {
    heuristicsRepository = {
      upsertHeuristics: jest.fn(),
      getHeuristicsForRule: jest.fn(),
      getAllHeuristicsForRule: jest.fn(),
      updateHeuristics: jest.fn(),
      getHeuristicsById: jest.fn(),
    } as jest.Mocked<IRuleDetectionHeuristicsRepository>;

    repositories = {
      getRuleDetectionHeuristicsRepository: jest.fn(() => heuristicsRepository),
    } as unknown as jest.Mocked<ILinterRepositories>;

    useCase = new CopyDetectionHeuristicsUseCase(repositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when old rule has detection heuristics', () => {
    it('returns correct count of copied heuristics', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedHeuristicsCount).toBe(2);
    });

    it('calls upsertHeuristics for each heuristic', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(heuristicsRepository.upsertHeuristics).toHaveBeenCalledTimes(2);
    });

    it('copies first heuristic with new ruleId', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const firstCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(firstCopiedHeuristic.ruleId).toBe(newRuleId);
    });

    it('copies first heuristic with new ID', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const firstCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(firstCopiedHeuristic.id).not.toBe(heuristic1.id);
    });

    it('preserves TypeScript language for first heuristic', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const firstCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(firstCopiedHeuristic.language).toBe(
        ProgrammingLanguage.TYPESCRIPT,
      );
    });

    it('preserves heuristics content for first heuristic', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const firstCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(firstCopiedHeuristic.heuristics).toBe('TypeScript heuristics');
    });

    it('copies second heuristic with new ruleId', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const secondCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[1][0];
      expect(secondCopiedHeuristic.ruleId).toBe(newRuleId);
    });

    it('copies second heuristic with new ID', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const secondCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[1][0];
      expect(secondCopiedHeuristic.id).not.toBe(heuristic2.id);
    });

    it('preserves Python language for second heuristic', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const secondCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[1][0];
      expect(secondCopiedHeuristic.language).toBe(ProgrammingLanguage.PYTHON);
    });

    it('preserves heuristics content for second heuristic', async () => {
      const heuristic1 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      });
      const heuristic2 = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic1,
        heuristic2,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const secondCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[1][0];
      expect(secondCopiedHeuristic.heuristics).toBe('Python heuristics');
    });

    it('preserves TypeScript language', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript specific heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.language).toBe(ProgrammingLanguage.TYPESCRIPT);
    });

    it('preserves TypeScript heuristics content', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript specific heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.heuristics).toBe('TypeScript specific heuristics');
    });

    it('preserves Python language', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python specific heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.language).toBe(ProgrammingLanguage.PYTHON);
    });

    it('preserves Python heuristics content', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'Python specific heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.heuristics).toBe('Python specific heuristics');
    });

    it('preserves Java language', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.JAVA,
        heuristics: 'Java specific heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.language).toBe(ProgrammingLanguage.JAVA);
    });

    it('preserves Java heuristics content', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.JAVA,
        heuristics: 'Java specific heuristics',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.heuristics).toBe('Java specific heuristics');
    });

    it('preserves Rust language', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.RUST,
        heuristics: 'Detailed Rust heuristics with specific rules',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.language).toBe(ProgrammingLanguage.RUST);
    });

    it('preserves Rust heuristics content', async () => {
      const heuristic = detectionHeuristicsFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.RUST,
        heuristics: 'Detailed Rust heuristics with specific rules',
      });

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([
        heuristic,
      ]);
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(copiedHeuristic.heuristics).toBe(
        'Detailed Rust heuristics with specific rules',
      );
    });

    it('returns correct count for multiple languages', async () => {
      const heuristics = [
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: 'TS heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          heuristics: 'Python heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.JAVA,
          heuristics: 'Java heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.GO,
          heuristics: 'Go heuristics',
        }),
      ];

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue(
        heuristics,
      );
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedHeuristicsCount).toBe(4);
    });

    it('calls upsertHeuristics for each language', async () => {
      const heuristics = [
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: 'TS heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          heuristics: 'Python heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.JAVA,
          heuristics: 'Java heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.GO,
          heuristics: 'Go heuristics',
        }),
      ];

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue(
        heuristics,
      );
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(heuristicsRepository.upsertHeuristics).toHaveBeenCalledTimes(4);
    });

    it('preserves TypeScript language in multiple languages scenario', async () => {
      const heuristics = [
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: 'TS heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          heuristics: 'Python heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.JAVA,
          heuristics: 'Java heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.GO,
          heuristics: 'Go heuristics',
        }),
      ];

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue(
        heuristics,
      );
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const firstCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[0][0];
      expect(firstCopiedHeuristic.language).toBe(
        ProgrammingLanguage.TYPESCRIPT,
      );
    });

    it('preserves Python language in multiple languages scenario', async () => {
      const heuristics = [
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: 'TS heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          heuristics: 'Python heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.JAVA,
          heuristics: 'Java heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.GO,
          heuristics: 'Go heuristics',
        }),
      ];

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue(
        heuristics,
      );
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const secondCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[1][0];
      expect(secondCopiedHeuristic.language).toBe(ProgrammingLanguage.PYTHON);
    });

    it('preserves Java language in multiple languages scenario', async () => {
      const heuristics = [
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: 'TS heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          heuristics: 'Python heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.JAVA,
          heuristics: 'Java heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.GO,
          heuristics: 'Go heuristics',
        }),
      ];

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue(
        heuristics,
      );
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const thirdCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[2][0];
      expect(thirdCopiedHeuristic.language).toBe(ProgrammingLanguage.JAVA);
    });

    it('preserves Go language in multiple languages scenario', async () => {
      const heuristics = [
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: 'TS heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          heuristics: 'Python heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.JAVA,
          heuristics: 'Java heuristics',
        }),
        detectionHeuristicsFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.GO,
          heuristics: 'Go heuristics',
        }),
      ];

      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue(
        heuristics,
      );
      heuristicsRepository.upsertHeuristics.mockResolvedValue(undefined);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const fourthCopiedHeuristic =
        heuristicsRepository.upsertHeuristics.mock.calls[3][0];
      expect(fourthCopiedHeuristic.language).toBe(ProgrammingLanguage.GO);
    });
  });

  describe('when old rule has no detection heuristics', () => {
    it('returns 0 copied heuristics count', async () => {
      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([]);

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedHeuristicsCount).toBe(0);
    });

    it('does not call upsertHeuristics', async () => {
      heuristicsRepository.getAllHeuristicsForRule.mockResolvedValue([]);

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(heuristicsRepository.upsertHeuristics).not.toHaveBeenCalled();
    });
  });

  describe('when repository throws error', () => {
    it('logs error and re-throws', async () => {
      const error = new Error('Database connection failed');
      heuristicsRepository.getAllHeuristicsForRule.mockRejectedValue(error);

      await expect(
        useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
