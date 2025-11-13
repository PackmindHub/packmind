import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMInput,
  PMPortal,
  PMRadioGroup,
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

const OTHER_ANSWER_VALUE = '__OTHER__';

export const DetectionAssessmentDrawer: React.FC<
  DetectionAssessmentDrawerProps
> = ({ isOpen, onClose, assessment, standardId, ruleId, language }) => {
  const [heuristicsText, setHeuristicsText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [otherAnswerText, setOtherAnswerText] = useState('');

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

  const handleAnswerChange = useCallback((value: string | null) => {
    setSelectedAnswer(value);
    if (value !== OTHER_ANSWER_VALUE) {
      setOtherAnswerText('');
    }
  }, []);

  const handleOtherAnswerTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOtherAnswerText(e.target.value);
    },
    [],
  );

  const isSaveDisabled = useCallback(() => {
    if (updateHeuristics.isPending) {
      return true;
    }

    const hasHeuristicsChanges = hasChanges;
    const hasAnswerSelected = selectedAnswer !== null;

    if (!hasHeuristicsChanges && !hasAnswerSelected) {
      return true;
    }

    if (selectedAnswer === OTHER_ANSWER_VALUE && !otherAnswerText.trim()) {
      return true;
    }

    return false;
  }, [updateHeuristics.isPending, hasChanges, selectedAnswer, otherAnswerText]);

  const handleSave = useCallback(() => {
    if (!detectionHeuristics?.id) {
      return;
    }

    const heuristicsArray = heuristicsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let clarificationQuestion:
      | { question: string; answer: string }
      | undefined = undefined;

    if (selectedAnswer !== null && assessment.clarificationQuestion) {
      const answer =
        selectedAnswer === OTHER_ANSWER_VALUE
          ? otherAnswerText.trim()
          : selectedAnswer;

      if (answer) {
        clarificationQuestion = {
          question: assessment.clarificationQuestion,
          answer,
        };
      }
    }

    updateHeuristics.mutate(
      {
        standardId,
        ruleId,
        detectionHeuristicsId: detectionHeuristics.id,
        heuristics: heuristicsArray,
        clarificationQuestion,
      },
      {
        onSuccess: () => {
          setHasChanges(false);
          setSelectedAnswer(null);
          setOtherAnswerText('');
        },
      },
    );
  }, [
    detectionHeuristics,
    heuristicsText,
    standardId,
    ruleId,
    updateHeuristics,
    selectedAnswer,
    otherAnswerText,
    assessment.clarificationQuestion,
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

                      {assessment.clarificationQuestion &&
                        assessment.clarificationAnswers &&
                        isEditable && (
                          <PMVStack
                            gap={3}
                            align="flex-start"
                            width="full"
                            mt={4}
                          >
                            <PMText fontWeight="medium">
                              Clarification Question:
                            </PMText>
                            <PMBox
                              borderRadius="md"
                              borderWidth={1}
                              borderColor="border.tertiary"
                              p={3}
                              width="full"
                            >
                              <PMText mb={3}>
                                {assessment.clarificationQuestion}
                              </PMText>
                              <PMRadioGroup.Root
                                value={selectedAnswer ?? undefined}
                                onValueChange={(details) =>
                                  handleAnswerChange(details.value)
                                }
                              >
                                <PMVStack gap={2} align="flex-start">
                                  {assessment.clarificationAnswers.map(
                                    (answer) => (
                                      <PMRadioGroup.Item
                                        key={answer}
                                        value={answer}
                                      >
                                        <PMRadioGroup.ItemHiddenInput />
                                        <PMRadioGroup.ItemControl />
                                        <PMRadioGroup.ItemText>
                                          {answer}
                                        </PMRadioGroup.ItemText>
                                      </PMRadioGroup.Item>
                                    ),
                                  )}
                                  <PMRadioGroup.Item value={OTHER_ANSWER_VALUE}>
                                    <PMRadioGroup.ItemHiddenInput />
                                    <PMRadioGroup.ItemControl />
                                    <PMRadioGroup.ItemText>
                                      Other
                                    </PMRadioGroup.ItemText>
                                  </PMRadioGroup.Item>
                                </PMVStack>
                              </PMRadioGroup.Root>
                              {selectedAnswer === OTHER_ANSWER_VALUE && (
                                <PMBox mt={2} ml={6}>
                                  <PMInput
                                    placeholder="Please specify..."
                                    value={otherAnswerText}
                                    onChange={handleOtherAnswerTextChange}
                                    disabled={updateHeuristics.isPending}
                                  />
                                </PMBox>
                              )}
                            </PMBox>
                          </PMVStack>
                        )}
                    </>
                  )}
                  <PMHStack gap={2} justify="flex-end" width="full">
                    {detectionHeuristics && isEditable && (
                      <PMButton
                        onClick={handleSave}
                        disabled={isSaveDisabled()}
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
