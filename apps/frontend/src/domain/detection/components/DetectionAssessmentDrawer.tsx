import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PMBadge,
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
  pmToaster,
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
  assessment: RuleDetectionAssessment & { updatedAt?: Date };
  standardId: string;
  ruleId: string;
  language: string;
}

const OTHER_ANSWER_VALUE = '__OTHER__';

const getStatusColor = (status: RuleDetectionAssessmentStatus): string => {
  switch (status) {
    case RuleDetectionAssessmentStatus.FAILED:
      return 'red';
    case RuleDetectionAssessmentStatus.SUCCESS:
      return 'green';
    case RuleDetectionAssessmentStatus.IN_PROGRESS:
      return 'gray';
    default:
      return 'gray';
  }
};

const formatAssessmentStatus = (
  status: RuleDetectionAssessmentStatus,
): string => {
  switch (status) {
    case RuleDetectionAssessmentStatus.FAILED:
      return 'Failed';
    case RuleDetectionAssessmentStatus.SUCCESS:
      return 'Success';
    case RuleDetectionAssessmentStatus.IN_PROGRESS:
      return 'In Progress';
    case RuleDetectionAssessmentStatus.NOT_STARTED:
      return 'Not Started';
    default:
      return status;
  }
};

const formatDuration = (updatedAt: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - updatedAt.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

export const DetectionAssessmentDrawer: React.FC<
  DetectionAssessmentDrawerProps
> = ({ isOpen, onClose, assessment, standardId, ruleId, language }) => {
  const [heuristicsText, setHeuristicsText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [otherAnswerText, setOtherAnswerText] = useState('');
  const [previousStatus, setPreviousStatus] =
    useState<RuleDetectionAssessmentStatus | null>(null);

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

  useEffect(() => {
    // Track status changes
    setPreviousStatus(assessment.status);
  }, [assessment.status]);

  useEffect(() => {
    // Show success toaster when assessment transitions to SUCCESS and drawer is open
    const justChangedToSuccess =
      previousStatus !== null &&
      previousStatus !== RuleDetectionAssessmentStatus.SUCCESS &&
      assessment.status === RuleDetectionAssessmentStatus.SUCCESS;

    if (justChangedToSuccess && isOpen) {
      pmToaster.create({
        type: 'success',
        title: 'Assessment successful!',
        description: 'Program generation has started.',
      });
    }
  }, [previousStatus, assessment.status, isOpen]);

  const handleOpenChange = useCallback(
    ({ open }: { open: boolean }) => {
      // Prevent auto-close when status just changed to SUCCESS
      const justChangedToSuccess =
        previousStatus !== null &&
        previousStatus !== RuleDetectionAssessmentStatus.SUCCESS &&
        assessment.status === RuleDetectionAssessmentStatus.SUCCESS;

      if (!open && !justChangedToSuccess) {
        onClose();
      }
    },
    [previousStatus, assessment.status, onClose],
  );

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
    <PMDrawer.Root open={isOpen} onOpenChange={handleOpenChange} size="xl">
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMVStack align="flex-start" gap={2} width="full">
                <PMHStack gap={3} align="center">
                  <PMDrawer.Title>Rule detection assessment</PMDrawer.Title>
                  <PMBadge colorPalette={getStatusColor(assessment.status)}>
                    Status: {formatAssessmentStatus(assessment.status)}
                  </PMBadge>
                  {assessment.updatedAt && (
                    <PMText fontSize="sm" color="tertiary">
                      {formatDuration(new Date(assessment.updatedAt))}
                    </PMText>
                  )}
                </PMHStack>
              </PMVStack>
            </PMDrawer.Header>
            <PMDrawer.Body>
              <PMVStack width="full">
                {assessment.details && (
                  <PMVStack width="full" gap={2} align="flex-start">
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
                                        <PMRadioGroup.ItemControl>
                                          <PMRadioGroup.ItemIndicator />
                                        </PMRadioGroup.ItemControl>
                                        <PMRadioGroup.ItemText>
                                          {answer}
                                        </PMRadioGroup.ItemText>
                                      </PMRadioGroup.Item>
                                    ),
                                  )}
                                  <PMRadioGroup.Item value={OTHER_ANSWER_VALUE}>
                                    <PMRadioGroup.ItemHiddenInput />
                                    <PMRadioGroup.ItemControl>
                                      <PMRadioGroup.ItemIndicator />
                                    </PMRadioGroup.ItemControl>
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
