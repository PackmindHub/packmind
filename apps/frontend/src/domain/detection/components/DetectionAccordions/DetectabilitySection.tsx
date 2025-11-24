import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMGrid,
  PMInput,
  PMRadioGroup,
  PMText,
  PMVStack,
  PMIcon,
  PMHeading,
  PMList,
  PMSpinner,
} from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { LuSendHorizontal } from 'react-icons/lu';
import {
  useGetDetectionHeuristicsQuery,
  useUpdateDetectionHeuristicsMutation,
  useGetActiveDetectionProgramsQuery,
  useGetRuleDetectionAssessmentQuery,
} from '../../api/queries/DetectionProgramQueries';
import { HeuristicsEditor } from '../HeuristicsEditor';

interface DetectabilitySectionProps {
  standardId: string;
  ruleId: string;
  language: string;
}

const OTHER_ANSWER_VALUE = '__OTHER__';

const LoadingOverlay: React.FC = () => (
  <PMBox
    position="absolute"
    top={0}
    left={0}
    right={0}
    bottom={0}
    background={'background.primary'}
    display="flex"
    alignItems="center"
    justifyContent="center"
    borderRadius="md"
    zIndex={1}
  >
    <PMVStack gap={3}>
      <PMSpinner size="lg" />
      <PMText color="faded">
        Packmind is checking the detectability of the rule
      </PMText>
    </PMVStack>
  </PMBox>
);

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

export const DetectabilitySection: React.FC<DetectabilitySectionProps> = ({
  standardId,
  ruleId,
  language,
}) => {
  const [heuristicsText, setHeuristicsText] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [otherAnswerText, setOtherAnswerText] = useState('');
  const [previousAssessmentData, setPreviousAssessmentData] = useState<{
    details?: string;
    clarificationQuestion: string | null;
    clarificationAnswers: string[] | null;
    updatedAt?: Date;
  }>({
    clarificationQuestion: null,
    clarificationAnswers: null,
  });

  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    language,
  );

  const { data: detectionHeuristics, isLoading: isLoadingHeuristics } =
    useGetDetectionHeuristicsQuery(standardId, ruleId, language);

  const { data: activePrograms } = useGetActiveDetectionProgramsQuery(
    standardId,
    ruleId,
  );

  const updateHeuristics = useUpdateDetectionHeuristicsMutation();

  const isEditable = useMemo(() => {
    if (!assessment) return false;

    // Check if assessment is in error
    const isAssessmentInError =
      assessment.status === RuleDetectionAssessmentStatus.FAILED;

    // Check if program generation is in error, failed, or needs review
    const programForLanguage = activePrograms?.find(
      (program) =>
        program.detectionProgram?.language === language ||
        program.language === language,
    );
    const isProgramGenerationInError =
      programForLanguage?.detectionProgram?.status === DetectionStatus.ERROR ||
      programForLanguage?.detectionProgram?.status ===
        DetectionStatus.FAILURE ||
      programForLanguage?.detectionProgram?.status ===
        DetectionStatus.TO_REVIEW;

    return isAssessmentInError || isProgramGenerationInError;
  }, [assessment, activePrograms, language]);

  useEffect(() => {
    if (detectionHeuristics && Array.isArray(detectionHeuristics.heuristics)) {
      // Join array with newlines for display
      setHeuristicsText(detectionHeuristics.heuristics.join('\n'));
    }
  }, [detectionHeuristics]);

  useEffect(() => {
    if (
      assessment &&
      assessment.status === RuleDetectionAssessmentStatus.SUCCESS
    ) {
      setPreviousAssessmentData({
        details: assessment.details,
        clarificationQuestion: assessment.clarificationQuestion,
        clarificationAnswers: assessment.clarificationAnswers,
        updatedAt: assessment.updatedAt,
      });
    }
  }, [assessment]);

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

  const isSendDisabled = useCallback(() => {
    if (updateHeuristics.isPending) {
      return true;
    }

    const hasAnswerSelected = selectedAnswer !== null;

    if (!hasAnswerSelected) {
      return true;
    }

    if (selectedAnswer === OTHER_ANSWER_VALUE && !otherAnswerText.trim()) {
      return true;
    }

    return false;
  }, [updateHeuristics.isPending, selectedAnswer, otherAnswerText]);

  const handleHeuristicsSubmit = useCallback(
    (text: string) => {
      if (!detectionHeuristics?.id || !assessment) {
        return;
      }

      // Save current assessment data before mutation
      setPreviousAssessmentData({
        details: assessment.details,
        clarificationQuestion: assessment.clarificationQuestion,
        clarificationAnswers: assessment.clarificationAnswers,
        updatedAt: assessment.updatedAt,
      });

      const heuristicsArray = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      updateHeuristics.mutate({
        standardId,
        ruleId,
        detectionHeuristicsId: detectionHeuristics.id,
        heuristics: heuristicsArray,
      });
    },
    [detectionHeuristics, standardId, ruleId, updateHeuristics, assessment],
  );

  const handleSendAnswer = useCallback(() => {
    if (!detectionHeuristics?.id || !assessment) {
      return;
    }

    // Save current assessment data before mutation
    setPreviousAssessmentData({
      details: assessment.details,
      clarificationQuestion: assessment.clarificationQuestion,
      clarificationAnswers: assessment.clarificationAnswers,
      updatedAt: assessment.updatedAt,
    });

    const heuristicsArray = heuristicsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let clarificationQuestion:
      | { question: string; answer: string }
      | undefined = undefined;

    if (selectedAnswer !== null && assessment?.clarificationQuestion) {
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
    assessment,
  ]);

  if (!assessment || !language) {
    return null;
  }

  const isAssessmentPending =
    assessment.status === RuleDetectionAssessmentStatus.IN_PROGRESS;

  const displayDetails = isAssessmentPending
    ? previousAssessmentData.details
    : assessment.details;

  const displayClarificationQuestion = isAssessmentPending
    ? previousAssessmentData.clarificationQuestion
    : assessment.clarificationQuestion;

  const displayClarificationAnswers = isAssessmentPending
    ? previousAssessmentData.clarificationAnswers
    : assessment.clarificationAnswers;

  const displayUpdatedAt = isAssessmentPending
    ? previousAssessmentData.updatedAt
    : assessment.updatedAt;

  // Hide clues block if assessment is successful and there are no heuristics
  // OR if assessment is in progress and there's no previous data
  const shouldShowCluesBlock =
    (assessment.status !== RuleDetectionAssessmentStatus.SUCCESS ||
      (detectionHeuristics &&
        detectionHeuristics.heuristics &&
        detectionHeuristics.heuristics.length > 0)) &&
    !(
      isAssessmentPending &&
      !previousAssessmentData.clarificationQuestion &&
      !detectionHeuristics?.heuristics?.length
    );

  return (
    <PMVStack width="full" gap={0} p={4}>
      {(displayDetails ||
        (isAssessmentPending && !previousAssessmentData.details)) && (
        <PMVStack width="full" gap={2} align="flex-start">
          {displayDetails && (
            <PMText color="tertiary">Why this rule cannot be detected:</PMText>
          )}
          <PMVStack
            borderRadius="md"
            p={3}
            rounded="md"
            textAlign="left"
            width="full"
            position="relative"
            minHeight={
              isAssessmentPending && !previousAssessmentData.details
                ? '150px'
                : undefined
            }
          >
            {displayDetails && (
              <>
                <PMText whiteSpace="pre-wrap" width="full">
                  {displayDetails}
                </PMText>
                {displayUpdatedAt && (
                  <PMText
                    fontSize="sm"
                    color="tertiary"
                    textAlign="right"
                    mt={2}
                    width="full"
                  >
                    Last updated: {formatDuration(new Date(displayUpdatedAt))}
                  </PMText>
                )}
              </>
            )}
            {isAssessmentPending && <LoadingOverlay />}
          </PMVStack>
        </PMVStack>
      )}

      {shouldShowCluesBlock && (
        <PMVStack width="full" gap={2} align="flex-start">
          <PMText color="tertiary">How to detect it?</PMText>
          {/** Use grid to guarantee equal heights between columns */}
          <PMGrid
            gap={4}
            alignItems="stretch"
            width="full"
            gridTemplateColumns={
              displayClarificationQuestion && displayClarificationAnswers
                ? '1fr 1fr'
                : '1fr'
            }
          >
            {displayClarificationQuestion && displayClarificationAnswers && (
              <PMVStack
                borderRadius="md"
                borderWidth={1}
                borderColor="border.tertiary"
                p={3}
                width="full"
                height="full"
                gap={3}
                justifyContent="space-between"
                position="relative"
              >
                <PMVStack gap={3} width="full">
                  <PMHeading width="full" level="h5">
                    {displayClarificationQuestion}
                  </PMHeading>
                  <PMRadioGroup.Root
                    value={selectedAnswer ?? undefined}
                    onValueChange={(details) =>
                      handleAnswerChange(details.value)
                    }
                    variant="outline"
                    colorPalette="blue"
                  >
                    <PMVStack gap={2} align="flex-start">
                      {displayClarificationAnswers.map((answer) => (
                        <PMRadioGroup.Item key={answer} value={answer}>
                          <PMRadioGroup.ItemHiddenInput />
                          <PMRadioGroup.ItemControl>
                            <PMRadioGroup.ItemIndicator borderColor="border.tertiary" />
                          </PMRadioGroup.ItemControl>
                          <PMRadioGroup.ItemText>
                            {answer}
                          </PMRadioGroup.ItemText>
                        </PMRadioGroup.Item>
                      ))}
                      <PMRadioGroup.Item value={OTHER_ANSWER_VALUE}>
                        <PMRadioGroup.ItemHiddenInput />
                        <PMRadioGroup.ItemControl>
                          <PMRadioGroup.ItemIndicator borderColor="border.tertiary" />
                        </PMRadioGroup.ItemControl>
                        <PMRadioGroup.ItemText>Other</PMRadioGroup.ItemText>
                      </PMRadioGroup.Item>
                    </PMVStack>
                  </PMRadioGroup.Root>
                  {selectedAnswer === OTHER_ANSWER_VALUE && (
                    <PMBox width="full">
                      <PMInput
                        placeholder="Please specify..."
                        value={otherAnswerText}
                        onChange={handleOtherAnswerTextChange}
                        disabled={updateHeuristics.isPending}
                        width="full"
                        size="sm"
                      />
                    </PMBox>
                  )}
                </PMVStack>
                <PMHStack gap={2} justify="flex-end" width="full">
                  {detectionHeuristics && (
                    <PMButton
                      onClick={handleSendAnswer}
                      disabled={isSendDisabled()}
                      loading={updateHeuristics.isPending}
                      size="xs"
                    >
                      Send{' '}
                      <PMIcon size="xs">
                        <LuSendHorizontal />
                      </PMIcon>
                    </PMButton>
                  )}
                </PMHStack>
                {isAssessmentPending && <LoadingOverlay />}
              </PMVStack>
            )}

            <PMBox width="full" height="full">
              {isLoadingHeuristics ? (
                <PMText color="faded">Loading clues...</PMText>
              ) : (
                <HeuristicsEditor
                  value={heuristicsText ?? ''}
                  onSubmit={handleHeuristicsSubmit}
                  isLoading={updateHeuristics.isPending}
                  isEditable={isEditable}
                  maxLength={3000}
                />
              )}
            </PMBox>
          </PMGrid>
        </PMVStack>
      )}

      {assessment.status === RuleDetectionAssessmentStatus.SUCCESS && (
        <PMVStack width="full" align="flex-start" mt={2}>
          <PMHeading size="sm" color="tertiary">
            Flagged a false positive?
          </PMHeading>
          <PMList.Root as="ul" listStyle="disc" pl={4}>
            <PMList.Item>
              <PMText color="tertiary">
                Add a new &quot;don&apos;t&quot; example that reflects the code
                flagged as a false positive
              </PMText>
            </PMList.Item>
            <PMList.Item>
              <PMText color="tertiary">
                The status of the detection program should be updated to
                &quot;To review&quot;
              </PMText>
            </PMList.Item>
            <PMList.Item>
              <PMText color="tertiary">
                You can then update the detection clues to indicate why this
                kind of code example should not be flagged
              </PMText>
            </PMList.Item>
            <PMList.Item>
              <PMText color="tertiary">
                Click on &quot;Retry&quot; to re-generate a new detection
                program
              </PMText>
            </PMList.Item>
          </PMList.Root>
        </PMVStack>
      )}
    </PMVStack>
  );
};
