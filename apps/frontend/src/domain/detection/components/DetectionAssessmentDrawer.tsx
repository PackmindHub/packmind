import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import {
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import {
  useGetDetectionHeuristicsQuery,
  useUpdateDetectionHeuristicsMutation,
  useGetActiveDetectionProgramsQuery,
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

  const { data: activePrograms } = useGetActiveDetectionProgramsQuery(
    standardId,
    ruleId,
  );

  const updateHeuristics = useUpdateDetectionHeuristicsMutation();

  const isEditable = useMemo(() => {
    // Check if assessment is in error
    const isAssessmentInError =
      assessment.status === RuleDetectionAssessmentStatus.FAILED;

    // Check if program generation is in error
    const programForLanguage = activePrograms?.find(
      (program) =>
        program.detectionProgram?.language === language ||
        program.language === language,
    );
    const isProgramGenerationInError =
      programForLanguage?.detectionProgram?.status === DetectionStatus.ERROR ||
      programForLanguage?.detectionProgram?.status === DetectionStatus.FAILURE;

    return isAssessmentInError || isProgramGenerationInError;
  }, [assessment.status, activePrograms, language]);

  useEffect(() => {
    if (detectionHeuristics && Array.isArray(detectionHeuristics.heuristics)) {
      // Join array with newlines for display in textarea
      setHeuristicsText(detectionHeuristics.heuristics.join('\n'));
      setHasChanges(false);
    }
  }, [detectionHeuristics]);

  const handleHeuristicsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setHeuristicsText(newValue);
      const originalText = detectionHeuristics?.heuristics.join('\n') ?? '';
      setHasChanges(newValue !== originalText);
    },
    [detectionHeuristics],
  );

  const handleSave = useCallback(() => {
    if (!detectionHeuristics?.id) {
      console.error('No detection heuristics ID available');
      return;
    }

    // Split by newlines and filter out empty lines
    const heuristicsArray = heuristicsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    updateHeuristics.mutate(
      {
        standardId,
        ruleId,
        detectionHeuristicsId: detectionHeuristics.id,
        heuristics: heuristicsArray,
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
              <PMDrawer.Title>Rule detection assessment</PMDrawer.Title>
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
                    <>
                      <PMTextArea
                        value={heuristicsText ?? ''}
                        onChange={handleHeuristicsChange}
                        placeholder="Enter detection heuristics..."
                        rows={10}
                        disabled={!isEditable || updateHeuristics.isPending}
                        maxLength={3000}
                      />
                    </>
                  )}
                  <PMHStack gap={2} justify="flex-end" width="full">
                    {detectionHeuristics && isEditable && (
                      <PMButton
                        onClick={handleSave}
                        disabled={!hasChanges || updateHeuristics.isPending}
                        loading={updateHeuristics.isPending}
                      >
                        Save Changes
                      </PMButton>
                    )}
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
