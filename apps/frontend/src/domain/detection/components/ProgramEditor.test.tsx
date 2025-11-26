import { computeActiveConfigurationState } from './ProgramEditor';
import { ActiveConfigurationState } from './ActiveConfigurationSection/';
import {
  createActiveDetectionProgramId,
  createDetectionProgramId,
  createRuleId,
  DetectionModeEnum,
  DetectionStatus,
} from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { LanguageDetectionPrograms } from '@packmind/types';

describe('computeActiveConfigurationState', () => {
  let program: LanguageDetectionPrograms;

  beforeEach(() => {
    program = {
      id: createActiveDetectionProgramId('program-123'),
      language: ProgrammingLanguage.TYPESCRIPT,
      detectionProgramVersion: createDetectionProgramId('1'),
      ruleId: createRuleId('rule1'),
      detectionProgramDraftVersion: null,
      detectionProgram: null,
      draftDetectionProgram: null,
    };
  });

  describe('when no detection program exists', () => {
    beforeEach(() => {
      program.detectionProgramVersion = null;
      program.detectionProgram = null;
    });

    describe('when there is no draft program', () => {
      beforeEach(() => {
        program.draftDetectionProgram = null;
      });

      it('returns NO_CONFIG', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.NO_CONFIG);
      });
    });

    describe('when there is a draft program', () => {
      beforeEach(() => {
        program.draftDetectionProgram = {
          id: createDetectionProgramId('draft-123'),
          code: 'draft code',
          version: 1,
          language: ProgrammingLanguage.TYPESCRIPT,
          status: DetectionStatus.IN_PROGRESS,
          mode: DetectionModeEnum.SINGLE_AST,
          ruleId: createRuleId('rule-456'),
          sourceCodeState: 'AST',
        };
      });

      it('returns IN_PROGRESS', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.IN_PROGRESS);
      });
    });
  });

  describe('when detection program exists', () => {
    beforeEach(() => {
      program.detectionProgramVersion = createDetectionProgramId('1');
      program.detectionProgram = {
        id: createDetectionProgramId('detection-123'),
        code: 'detection code',
        version: 1,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: DetectionStatus.READY,
        mode: DetectionModeEnum.SINGLE_AST,
        ruleId: createRuleId('rule-456'),
        sourceCodeState: 'AST',
      };
    });

    describe('when detection program status is READY', () => {
      beforeEach(() => {
        program.detectionProgram!.status = DetectionStatus.READY;
      });

      it('returns OK', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.OK);
      });
    });

    describe('when detection program status is IN_PROGRESS', () => {
      beforeEach(() => {
        program.detectionProgram!.status = DetectionStatus.IN_PROGRESS;
      });

      it('returns IN_PROGRESS', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.IN_PROGRESS);
      });
    });

    describe('when detection program status is FAILURE', () => {
      beforeEach(() => {
        program.detectionProgram!.status = DetectionStatus.FAILURE;
      });

      it('returns ERROR', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.ERROR);
      });
    });

    describe('when detection program status is ERROR', () => {
      beforeEach(() => {
        program.detectionProgram!.status = DetectionStatus.ERROR;
      });

      it('returns ERROR', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.ERROR);
      });
    });

    describe('when detection program status is TO_REVIEW', () => {
      beforeEach(() => {
        program.detectionProgram!.status = DetectionStatus.TO_REVIEW;
      });

      it('returns TO_REVIEW', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.TO_REVIEW);
      });
    });

    describe('when detection program status is unknown', () => {
      beforeEach(() => {
        program.detectionProgram!.status = 'UNKNOWN_STATUS' as DetectionStatus;
      });

      it('returns ERROR as fallback', () => {
        const result = computeActiveConfigurationState(
          program,
          program.detectionProgram,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.ERROR);
      });
    });
  });

  describe('when detection program version exists but detection program is null', () => {
    beforeEach(() => {
      program.detectionProgramVersion = createDetectionProgramId('1');
      program.detectionProgram = null;
    });

    describe('when there is no draft program', () => {
      beforeEach(() => {
        program.draftDetectionProgram = null;
      });

      it('returns NO_CONFIG', () => {
        const result = computeActiveConfigurationState(
          program,
          null,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.NO_CONFIG);
      });
    });

    describe('when there is a draft program', () => {
      beforeEach(() => {
        program.draftDetectionProgram = {
          id: createDetectionProgramId('draft-123'),
          code: 'draft code',
          version: 1,
          language: ProgrammingLanguage.TYPESCRIPT,
          status: DetectionStatus.IN_PROGRESS,
          mode: DetectionModeEnum.SINGLE_AST,
          ruleId: createRuleId('rule-456'),
          sourceCodeState: 'AST',
        };
      });

      it('returns IN_PROGRESS', () => {
        const result = computeActiveConfigurationState(
          program,
          null,
          program.draftDetectionProgram,
        );

        expect(result).toBe(ActiveConfigurationState.IN_PROGRESS);
      });
    });
  });
});
