import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PMAccordion,
  PMBox,
  PMButton,
  PMHStack,
  PMInput,
  PMRadioGroup,
  PMSpinner,
  PMText,
  PMTextArea,
  PMVStack,
  PMIcon,
} from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { LuCircleCheck, LuCircleX, LuSendHorizontal } from 'react-icons/lu';
import {
  useGetDetectionHeuristicsQuery,
  useUpdateDetectionHeuristicsMutation,
  useGetActiveDetectionProgramsQuery,
  useGetRuleDetectionAssessmentQuery,
} from '../api/queries/DetectionProgramQueries';

interface DetectabilitySectionProps {
  standardId: string;
  ruleId: string;
  language: string;
  defaultOpen: boolean;
}

const OTHER_ANSWER_VALUE = '__OTHER__';

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

const renderStatusIcon = (status: RuleDetectionAssessmentStatus) => {
  switch (status) {
    case RuleDetectionAssessmentStatus.SUCCESS:
      return (
        <PMIcon color="text.success" size={'md'}>
          <LuCircleCheck />
        </PMIcon>
      );
    case RuleDetectionAssessmentStatus.FAILED:
      return (
        <PMIcon color="text.error" size={'md'}>
          <LuCircleX />
        </PMIcon>
      );
    case RuleDetectionAssessmentStatus.IN_PROGRESS:
      return <PMSpinner size="sm" />;
    default:
      return null;
  }
};

interface AccordionSectionProps {
  value: string;
  defaultOpen: boolean;
  triggerContent: React.ReactNode;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  value,
  defaultOpen,
  triggerContent,
  children,
}) => {
  return (
    <PMAccordion.Root
      defaultValue={defaultOpen ? [value] : []}
      collapsible
      backgroundColor="background.primary"
      p="2"
      rounded="md"
      variant="plain"
    >
      <PMAccordion.Item value={value}>
        <PMAccordion.ItemTrigger cursor="pointer">
          {triggerContent}
        </PMAccordion.ItemTrigger>
        <PMAccordion.ItemContent>{children}</PMAccordion.ItemContent>
      </PMAccordion.Item>
    </PMAccordion.Root>
  );
};

export const DetectabilitySection: React.FC<DetectabilitySectionProps> = ({
  standardId,
  ruleId,
  language,
  defaultOpen,
}) => {
  const [heuristicsText, setHeuristicsText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [otherAnswerText, setOtherAnswerText] = useState('');

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
  }, [assessment, activePrograms, language]);

  const textareaRows = useMemo(() => {
    const heuristicsLines = heuristicsText.split('\n').length;
    const MIN_ROWS = 5;
    const MAX_ROWS = 8;

    if (heuristicsLines <= MIN_ROWS) {
      return MIN_ROWS;
    }

    if (heuristicsLines > MIN_ROWS && heuristicsLines < MAX_ROWS) {
      return heuristicsLines;
    }

    return MAX_ROWS;
  }, [heuristicsText]);

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

  const handleSendAnswer = useCallback(() => {
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
    assessment?.clarificationQuestion,
  ]);

  if (!assessment || !language) {
    return null;
  }

  return (
    <AccordionSection
      value="detectability"
      defaultOpen={defaultOpen}
      triggerContent={
        <PMHStack gap={3} align="center" width="full">
          <PMAccordion.ItemIndicator />
          <PMText>Detectability</PMText>
          <PMBox marginLeft="auto">{renderStatusIcon(assessment.status)}</PMBox>
        </PMHStack>
      }
    >
      <PMVStack width="full" gap={0} p={4}>
        {assessment.details && (
          <PMVStack width="full" gap={2} align="flex-start">
            <PMText color="tertiary">Why this rule cannot be detected:</PMText>
            <PMVStack
              borderRadius="md"
              p={3}
              rounded="md"
              textAlign="left"
              width="full"
            >
              <PMText whiteSpace="pre-wrap">{assessment.details}</PMText>
              {assessment.updatedAt && (
                <PMText
                  fontSize="sm"
                  color="tertiary"
                  textAlign="right"
                  mt={2}
                  width="full"
                >
                  Last updated: {formatDuration(new Date(assessment.updatedAt))}
                </PMText>
              )}
            </PMVStack>
          </PMVStack>
        )}

        <PMVStack width="full" gap={2} align="flex-start">
          <PMText color="tertiary">How to detect it?</PMText>
          <PMHStack gap={4} align="flex-start" width="full">
            {assessment.clarificationQuestion &&
              assessment.clarificationAnswers &&
              isEditable && (
                <PMVStack
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border.tertiary"
                  p={3}
                  width="50%"
                  gap={3}
                >
                  <PMText mb={3}>{assessment.clarificationQuestion}</PMText>
                  <PMRadioGroup.Root
                    value={selectedAnswer ?? undefined}
                    onValueChange={(details) =>
                      handleAnswerChange(details.value)
                    }
                  >
                    <PMVStack gap={2} align="flex-start">
                      {assessment.clarificationAnswers.map((answer) => (
                        <PMRadioGroup.Item key={answer} value={answer}>
                          <PMRadioGroup.ItemHiddenInput />
                          <PMRadioGroup.ItemControl>
                            <PMRadioGroup.ItemIndicator />
                          </PMRadioGroup.ItemControl>
                          <PMRadioGroup.ItemText>
                            {answer}
                          </PMRadioGroup.ItemText>
                        </PMRadioGroup.Item>
                      ))}
                      <PMRadioGroup.Item value={OTHER_ANSWER_VALUE}>
                        <PMRadioGroup.ItemHiddenInput />
                        <PMRadioGroup.ItemControl>
                          <PMRadioGroup.ItemIndicator />
                        </PMRadioGroup.ItemControl>
                        <PMRadioGroup.ItemText>Other</PMRadioGroup.ItemText>
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
                </PMVStack>
              )}

            <PMVStack
              gap={2}
              align="flex-start"
              width={
                assessment.clarificationQuestion &&
                assessment.clarificationAnswers &&
                isEditable
                  ? '50%'
                  : 'full'
              }
            >
              {isLoadingHeuristics ? (
                <PMText color="faded">Loading heuristics...</PMText>
              ) : (
                <PMTextArea
                  value={heuristicsText ?? ''}
                  onChange={handleHeuristicsChange}
                  placeholder="Enter detection heuristics..."
                  rows={textareaRows}
                  disabled={!isEditable || updateHeuristics.isPending}
                  maxLength={3000}
                />
              )}
            </PMVStack>
          </PMHStack>
        </PMVStack>
      </PMVStack>
    </AccordionSection>
  );
};
