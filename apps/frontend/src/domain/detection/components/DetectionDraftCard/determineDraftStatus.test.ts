import {
  DetectionStatus,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { determineDraftStatus, DraftStatus } from './determineDraftStatus';

describe('determineDraftStatus', () => {
  describe('when assessment is not started or in progress', () => {
    it('returns ASSESSING when assessment status is undefined', () => {
      const state = determineDraftStatus(
        undefined,
        DetectionStatus.IN_PROGRESS,
      );
      expect(state).toEqual(DraftStatus.ASSESSING);
    });

    it('returns ASSESSING when assessment status is NOT_STARTED', () => {
      const state = determineDraftStatus(
        RuleDetectionAssessmentStatus.NOT_STARTED,
        DetectionStatus.IN_PROGRESS,
      );
      expect(state).toEqual(DraftStatus.ASSESSING);
    });

    it('returns ASSESSING when assessment status is IN_PROGRESS', () => {
      const state = determineDraftStatus(
        RuleDetectionAssessmentStatus.IN_PROGRESS,
        DetectionStatus.IN_PROGRESS,
      );
      expect(state).toEqual(DraftStatus.ASSESSING);
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
      it('returns TO_REVIEW when draft status is TO_REVIEW', () => {
        const state = determineDraftStatus(
          RuleDetectionAssessmentStatus.SUCCESS,
          DetectionStatus.TO_REVIEW,
        );
        expect(state).toEqual(DraftStatus.TO_REVIEW);
      });

      describe('when program generation is in progress', () => {
        it('returns GENERATING when draft status is IN_PROGRESS', () => {
          const state = determineDraftStatus(
            RuleDetectionAssessmentStatus.SUCCESS,
            DetectionStatus.IN_PROGRESS,
          );
          expect(state).toEqual(DraftStatus.GENERATING);
        });
      });

      describe('when program generation is done', () => {
        describe('when program generation failed', () => {
          it('returns GENERATION_FAILED when draft status is FAILURE', () => {
            const state = determineDraftStatus(
              RuleDetectionAssessmentStatus.SUCCESS,
              DetectionStatus.FAILURE,
            );
            expect(state).toEqual(DraftStatus.GENERATION_FAILED);
          });

          it('returns GENERATION_FAILED when draft status is ERROR', () => {
            const state = determineDraftStatus(
              RuleDetectionAssessmentStatus.SUCCESS,
              DetectionStatus.ERROR,
            );
            expect(state).toEqual(DraftStatus.GENERATION_FAILED);
          });
        });

        describe('when program generation succeeded', () => {
          it('returns GENERATION_SUCCESSFUL when draft status is READY', () => {
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
