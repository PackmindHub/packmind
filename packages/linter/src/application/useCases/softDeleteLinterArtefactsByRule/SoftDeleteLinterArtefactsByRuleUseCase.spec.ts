import {
  createDetectionProgramId,
  createOrganizationId,
  createRuleId,
  createUserId,
  ProgrammingLanguage,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { SoftDeleteLinterArtefactsByRuleUseCase } from './SoftDeleteLinterArtefactsByRuleUseCase';
import type { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

describe('SoftDeleteLinterArtefactsByRuleUseCase', () => {
  let useCase: SoftDeleteLinterArtefactsByRuleUseCase;
  let repositories: jest.Mocked<ILinterRepositories>;

  const ruleId = createRuleId(uuidv4());
  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());

  const mockDetectionProgramRepo = {
    softDeleteByRuleId: jest.fn(),
    findByRuleId: jest.fn(),
  };
  const mockActiveDetectionProgramRepo = {
    deleteByRuleId: jest.fn(),
  };
  const mockRuleDetectionAssessmentRepo = {
    softDeleteByRuleId: jest.fn(),
  };
  const mockRuleDetectionHeuristicsRepo = {
    softDeleteByRuleId: jest.fn(),
  };
  const mockDetectionProgramMetadataRepo = {
    softDeleteByDetectionProgramIds: jest.fn(),
  };

  beforeEach(() => {
    repositories = {
      getDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(mockDetectionProgramRepo),
      getActiveDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(mockActiveDetectionProgramRepo),
      getRuleDetectionAssessmentRepository: jest
        .fn()
        .mockReturnValue(mockRuleDetectionAssessmentRepo),
      getRuleDetectionHeuristicsRepository: jest
        .fn()
        .mockReturnValue(mockRuleDetectionHeuristicsRepo),
      getDetectionProgramMetadataRepository: jest
        .fn()
        .mockReturnValue(mockDetectionProgramMetadataRepo),
    } as unknown as jest.Mocked<ILinterRepositories>;

    mockDetectionProgramRepo.softDeleteByRuleId.mockResolvedValue(undefined);
    mockDetectionProgramRepo.findByRuleId.mockResolvedValue([]);
    mockActiveDetectionProgramRepo.deleteByRuleId.mockResolvedValue(undefined);
    mockRuleDetectionAssessmentRepo.softDeleteByRuleId.mockResolvedValue(
      undefined,
    );
    mockRuleDetectionHeuristicsRepo.softDeleteByRuleId.mockResolvedValue(
      undefined,
    );
    mockDetectionProgramMetadataRepo.softDeleteByDetectionProgramIds.mockResolvedValue(
      undefined,
    );

    useCase = new SoftDeleteLinterArtefactsByRuleUseCase(
      repositories,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when executing soft-delete for a rule', () => {
    it('calls softDeleteByRuleId on detection program repository', async () => {
      await useCase.execute({ ruleId, userId, organizationId });

      expect(mockDetectionProgramRepo.softDeleteByRuleId).toHaveBeenCalledWith(
        ruleId,
      );
    });

    it('calls deleteByRuleId on active detection program repository', async () => {
      await useCase.execute({ ruleId, userId, organizationId });

      expect(
        mockActiveDetectionProgramRepo.deleteByRuleId,
      ).toHaveBeenCalledWith(ruleId);
    });

    it('calls softDeleteByRuleId on rule detection assessment repository', async () => {
      await useCase.execute({ ruleId, userId, organizationId });

      expect(
        mockRuleDetectionAssessmentRepo.softDeleteByRuleId,
      ).toHaveBeenCalledWith(ruleId);
    });

    it('calls softDeleteByRuleId on detection heuristics repository', async () => {
      await useCase.execute({ ruleId, userId, organizationId });

      expect(
        mockRuleDetectionHeuristicsRepo.softDeleteByRuleId,
      ).toHaveBeenCalledWith(ruleId);
    });
  });

  describe('when rule has detection programs with metadata', () => {
    const programId1 = createDetectionProgramId(uuidv4());
    const programId2 = createDetectionProgramId(uuidv4());

    beforeEach(async () => {
      mockDetectionProgramRepo.findByRuleId.mockResolvedValue([
        { id: programId1, ruleId, language: ProgrammingLanguage.TYPESCRIPT },
        { id: programId2, ruleId, language: ProgrammingLanguage.PYTHON },
      ]);

      await useCase.execute({ ruleId, userId, organizationId });
    });

    it('calls softDeleteByDetectionProgramIds with the program IDs', () => {
      expect(
        mockDetectionProgramMetadataRepo.softDeleteByDetectionProgramIds,
      ).toHaveBeenCalledWith([programId1, programId2]);
    });
  });

  describe('when a repository operation fails', () => {
    it('throws the error from detection program repository', async () => {
      mockDetectionProgramRepo.softDeleteByRuleId.mockRejectedValue(
        new Error('Detection program soft-delete failed'),
      );

      await expect(
        useCase.execute({ ruleId, userId, organizationId }),
      ).rejects.toThrow('Detection program soft-delete failed');
    });

    it('throws the error from active detection program repository', async () => {
      mockActiveDetectionProgramRepo.deleteByRuleId.mockRejectedValue(
        new Error('Active detection program delete failed'),
      );

      await expect(
        useCase.execute({ ruleId, userId, organizationId }),
      ).rejects.toThrow('Active detection program delete failed');
    });
  });
});
