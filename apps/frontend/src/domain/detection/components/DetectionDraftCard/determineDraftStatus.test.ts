import {
  DetectionStatus,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { determineDraftStatus, DraftStatus } from './determineDraftStatus';

describe('determineDraftStatus', () => {
  describe('when assessment is not started or in progress', () => {
    describe('when assessment status is undefined', () => {
      it('returns ASSESSING', () => {
        const state = determineDraftStatus(
          undefined,
          DetectionStatus.IN_PROGRESS,
        );
        expect(state).toEqual(DraftStatus.ASSESSING);
      });
    });

    describe('when assessment status is NOT_STARTED', () => {
      it('returns ASSESSING', () => {
        const state = determineDraftStatus(
          RuleDetectionAssessmentStatus.NOT_STARTED,
          DetectionStatus.IN_PROGRESS,
        );
        expect(state).toEqual(DraftStatus.ASSESSING);
      });
    });

    describe('when assessment status is IN_PROGRESS', () => {
      it('returns ASSESSING', () => {
        const state = determineDraftStatus(
          RuleDetectionAssessmentStatus.IN_PROGRESS,
          DetectionStatus.IN_PROGRESS,
        );
        expect(state).toEqual(DraftStatus.ASSESSING);
      });
    });
  });

  describe('when assessment is done', () => {
    describe('when assessment failed', () => {
      it('returns ASSESSMENT_FAILED', () => {
        const state = determineDraftStatus(
          RuleDetectionAssessmentStatus.FAILED,
          DetectionStatus.IN_PROGRESS,
        );
        expect(state).toEqual(DraftStatus.ASSESSMENT_FAILED);
      });
    });

    describe('when assessment succeeded', () => {
      describe('when draft status is TO_REVIEW', () => {
        it('returns TO_REVIEW', () => {
          const state = determineDraftStatus(
            RuleDetectionAssessmentStatus.SUCCESS,
            DetectionStatus.TO_REVIEW,
          );
          expect(state).toEqual(DraftStatus.TO_REVIEW);
        });
      });

      describe('when program generation is in progress', () => {
        describe('when draft status is IN_PROGRESS', () => {
          it('returns GENERATING', () => {
            const state = determineDraftStatus(
              RuleDetectionAssessmentStatus.SUCCESS,
              DetectionStatus.IN_PROGRESS,
            );
            expect(state).toEqual(DraftStatus.GENERATING);
          });
        });
      });

      describe('when program generation is done', () => {
        describe('when program generation failed', () => {
          describe('when draft status is FAILURE', () => {
            it('returns GENERATION_FAILED', () => {
              const state = determineDraftStatus(
                RuleDetectionAssessmentStatus.SUCCESS,
                DetectionStatus.FAILURE,
              );
              expect(state).toEqual(DraftStatus.GENERATION_FAILED);
            });
          });

          describe('when draft status is ERROR', () => {
            it('returns GENERATION_FAILED', () => {
              const state = determineDraftStatus(
                RuleDetectionAssessmentStatus.SUCCESS,
                DetectionStatus.ERROR,
              );
              expect(state).toEqual(DraftStatus.GENERATION_FAILED);
            });
          });
        });

        describe('when program generation succeeded', () => {
          describe('when draft status is READY', () => {
            it('returns GENERATION_SUCCESSFUL', () => {
              const state = determineDraftStatus(
                RuleDetectionAssessmentStatus.SUCCESS,
                DetectionStatus.READY,
              );
              expect(state).toEqual(DraftStatus.GENERATION_SUCCESSFUL);
            });
          });
        });
      });
    });
  });
});
