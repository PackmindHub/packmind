import React, { useState, useCallback, useEffect } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMPortal,
  PMText,
  PMTextArea,
  PMVStack,
} from '@packmind/ui';
import { RuleDetectionAssessment } from '@packmind/types';
import {
  useGetDetectionHeuristicsQuery,
  useUpdateDetectionHeuristicsMutation,
} from '../api/queries/DetectionProgramQueries';

interface DetectionAssessmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: RuleDetectionAssessment;
  standardId: string;
  ruleId: string;
  language: string;
}

export const DetectionAssessmentDrawer: React.FC<
  DetectionAssessmentDrawerProps
> = ({ isOpen, onClose, assessment, standardId, ruleId, language }) => {
  const [heuristicsText, setHeuristicsText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: detectionHeuristics, isLoading: isLoadingHeuristics } =
    useGetDetectionHeuristicsQuery(standardId, ruleId, language);

  const updateHeuristics = useUpdateDetectionHeuristicsMutation();

  useEffect(() => {
    if (detectionHeuristics) {
      setHeuristicsText(detectionHeuristics.heuristics);
      setHasChanges(false);
    }
  }, [detectionHeuristics]);

  const handleHeuristicsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setHeuristicsText(newValue);
      setHasChanges(newValue !== (detectionHeuristics?.heuristics ?? ''));
    },
    [detectionHeuristics],
  );

  const handleSave = useCallback(() => {
    if (!detectionHeuristics?.id) {
      console.error('No detection heuristics ID available');
      return;
    }

    updateHeuristics.mutate(
      {
        standardId,
        ruleId,
        detectionHeuristicsId: detectionHeuristics.id,
        heuristics: heuristicsText,
      },
      {
        onSuccess: () => {
          setHasChanges(false);
        },
        onError: (error) => {
          console.error('Failed to update detection heuristics:', error);
        },
      },
    );
  }, [
    detectionHeuristics,
    heuristicsText,
    standardId,
    ruleId,
    updateHeuristics,
  ]);

  const handleCancel = useCallback(() => {
    if (detectionHeuristics) {
      setHeuristicsText(detectionHeuristics.heuristics);
      setHasChanges(false);
    }
    onClose();
  }, [detectionHeuristics, onClose]);

  return (
    <PMDrawer.Root
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      size="xl"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMDrawer.Title>Detection Assessment Details</PMDrawer.Title>
            </PMDrawer.Header>
            <PMDrawer.Body>
              <PMVStack>
                {assessment.details && (
                  <PMVStack gap={2} align="flex-start">
                    <PMText color="tertiary">
                      Why this rule cannot be detected:
                    </PMText>
                    <PMBox
                      borderRadius="md"
                      borderWidth={1}
                      borderColor="border.tertiary"
                      p={3}
                      rounded="md"
                      mb={3}
                      width="full"
                    >
                      <PMText whiteSpace="pre-wrap">
                        {assessment.details}
                      </PMText>
                    </PMBox>
                  </PMVStack>
                )}

                <PMVStack gap={2} align="flex-start" width="full">
                  <PMText>Detection Heuristics:</PMText>
                  {isLoadingHeuristics ? (
                    <PMText color="faded">Loading heuristics...</PMText>
                  ) : (
                    <PMTextArea
                      value={heuristicsText ?? ''}
                      onChange={handleHeuristicsChange}
                      placeholder="Enter detection heuristics..."
                      rows={10}
                      disabled={updateHeuristics.isPending}
                    />
                  )}
                  <PMHStack gap={2} justify="flex-end" width="full">
                    <PMButton
                      onClick={handleSave}
                      disabled={!hasChanges || updateHeuristics.isPending}
                      loading={updateHeuristics.isPending}
                    >
                      Save Changes
                    </PMButton>
                  </PMHStack>
                </PMVStack>
              </PMVStack>
            </PMDrawer.Body>
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};
