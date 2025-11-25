import React, { useMemo, useState, useCallback } from 'react';
import {
  PMButton,
  PMHStack,
  PMText,
  PMVStack,
  PMBox,
  PMHeading,
  PMDialog,
  PMCodeMirror,
  PMBadge,
  DEFAULT_FEATURE_DOMAIN_MAP,
  isFeatureFlagEnabled,
} from '@packmind/ui';
import { LanguageDetectionPrograms } from '@packmind/types';
import {
  DetectionProgramId,
  DetectionStatus,
  StandardId,
} from '@packmind/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetActiveDetectionProgramsQuery,
  useGenerateProgramMutation,
  useActivateDetectionDraftMutation,
  useTestProgramExecutionMutation,
} from '../api/queries/DetectionProgramQueries';
import {
  GET_ACTIVE_DETECTION_PROGRAMS_KEY,
  GET_ALL_DETECTION_PROGRAMS_KEY,
} from '../api/queryKeys';
import { DraftCardData } from './DetectionDraftCard/DetectionDraftCard';
import {
  ActiveConfigurationSectionData as ActiveConfigurationCardData,
  ActiveConfigurationState,
} from './ActiveConfigurationSection/';
import { useGetStandardByIdQuery } from '../../standards/api/queries/StandardsQueries';
import { CopiableTextField } from '../../../shared/components/inputs/CopiableTextField';
import { DetectionProgramConfiguration } from './DetectionProgramConfiguration';
import { useGetMeQuery } from '../../accounts/api/queries/UserQueries';

interface ProgramEditorProps {
  standardId: string;
  ruleId: string;
  detectionLanguages?: string[];
  selectedLanguage: string;
  onNavigateToExamples?: () => void;
}

export function computeActiveConfigurationState(
  program: LanguageDetectionPrograms,
  detectionProgram: LanguageDetectionPrograms['detectionProgram'] | null,
  draftProgram: LanguageDetectionPrograms['draftDetectionProgram'] | null,
  isToReview?: boolean,
): ActiveConfigurationState {
  if (!program.detectionProgramVersion || !detectionProgram) {
    return draftProgram
      ? ActiveConfigurationState.IN_PROGRESS
      : ActiveConfigurationState.NO_CONFIG;
  }

  // Check if program needs review first (due to changes in rules/examples)
  if (isToReview) {
    return ActiveConfigurationState.TO_REVIEW;
  }

  switch (detectionProgram.status) {
    case DetectionStatus.READY:
      return ActiveConfigurationState.OK;

    case DetectionStatus.IN_PROGRESS:
      return ActiveConfigurationState.IN_PROGRESS;

    case DetectionStatus.FAILURE:
    case DetectionStatus.ERROR:
      return ActiveConfigurationState.ERROR;

    case DetectionStatus.TO_REVIEW:
      return ActiveConfigurationState.TO_REVIEW;

    default:
      return ActiveConfigurationState.ERROR;
  }
}

/**
 * Detects if a program needs review based on rule specifications or examples changes.
 * In a real scenario, this would check if rule specifications or examples
 * have been modified after the program creation date.
 *
 * Current implementation checks if the detection program has a "toReview" marker
 * or if the program data indicates it needs regeneration (from backend).
 */
function checkIfProgramNeedsReview(
  detectionProgram: LanguageDetectionPrograms['detectionProgram'] | null,
  draftProgram: LanguageDetectionPrograms['draftDetectionProgram'] | null,
): boolean {
  if (!detectionProgram) {
    return false;
  }

  // Don't mark as needing review if there's a ready draft with a higher version
  // In this case, the draft should be shown separately
  if (
    draftProgram &&
    draftProgram.status === DetectionStatus.READY &&
    draftProgram.version > detectionProgram.version
  ) {
    return false;
  }

  // Check if the backend has marked this program as needing review
  // This would typically be set when rule specifications or examples are modified
  // after the program was generated
  const programData = detectionProgram as unknown as {
    isToReview?: boolean;
    needsRegeneration?: boolean;
  };
  if (programData?.isToReview || programData?.needsRegeneration) {
    return true;
  }

  // TODO: Remove this temporary testing logic
  // For demonstration: mark READY programs as needing review to test the UI
  // In production, this will be determined by comparing rule/example modification
  // dates with the program creation date
  if (detectionProgram.status === DetectionStatus.READY) {
    return true; // Temporarily mark all READY programs as needing review for testing
  }

  return false;
}

const ProgramEditor: React.FC<ProgramEditorProps> = ({
  standardId,
  ruleId,
  detectionLanguages = [],
  selectedLanguage,
  onNavigateToExamples,
}) => {
  const queryClient = useQueryClient();
  const { data: meData } = useGetMeQuery();
  const userEmail = meData?.authenticated === true ? meData.user.email : null;

  const [activatingDraftId, setActivatingDraftId] = useState<string | null>(
    null,
  );
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedProgramForTest, setSelectedProgramForTest] = useState<
    DraftCardData | ActiveConfigurationCardData | null
  >(null);
  const [sandboxCode, setSandboxCode] = useState('');
  const [testResults, setTestResults] = useState<
    { line: number; character: number; rule: string; standard: string }[] | null
  >(null);

  const generateProgram = useGenerateProgramMutation();
  const activateDraft = useActivateDetectionDraftMutation();
  const testProgramExecution = useTestProgramExecutionMutation();

  const {
    data: activePrograms,
    refetch: refetchPrograms,
    isLoading: isLoadingActivePrograms,
    isError: isActiveProgramsError,
  } = useGetActiveDetectionProgramsQuery(standardId, ruleId);

  const { data: standardData } = useGetStandardByIdQuery(
    standardId as StandardId,
  );
  const standardSlug = standardData?.standard?.slug ?? null;
  const standardName = standardData?.standard?.name ?? undefined;

  const normalizedPrograms = useMemo<LanguageDetectionPrograms[]>(() => {
    if (!Array.isArray(activePrograms)) {
      return [];
    }

    return activePrograms as LanguageDetectionPrograms[];
  }, [activePrograms]);

  const activeConfigurations = useMemo<ActiveConfigurationCardData[]>(() => {
    if (!normalizedPrograms.length) {
      return [];
    }

    return normalizedPrograms
      .filter((program) => {
        const detectionProgram = program.detectionProgram ?? null;
        const lang = detectionProgram?.language ?? program.language;
        return lang === selectedLanguage;
      })
      .map((program) => {
        const detectionProgram = program.detectionProgram ?? null;
        const draftProgram = program.draftDetectionProgram ?? null;

        // Check if program needs review
        const isToReview = checkIfProgramNeedsReview(
          detectionProgram,
          draftProgram,
        );

        const state = computeActiveConfigurationState(
          program,
          detectionProgram,
          draftProgram,
          isToReview,
        );

        return {
          id: program.id,
          language: detectionProgram?.language ?? program.language,
          detectionProgram,
          draftProgram,
          state,
          isExampleOnly: program.isExampleOnly ?? false,
          isToReview,
        };
      });
  }, [normalizedPrograms, selectedLanguage]);

  const draftPrograms = useMemo<DraftCardData[]>(() => {
    if (!normalizedPrograms.length) {
      return [];
    }

    return normalizedPrograms.flatMap((program) => {
      if (!program.draftDetectionProgram) {
        return [];
      }

      const draftProgram = program.draftDetectionProgram;
      const lang = draftProgram.language ?? program.language;

      if (lang !== selectedLanguage) {
        return [];
      }

      return [
        {
          id: `${program.id}-draft-${draftProgram.id}`,
          language: lang,
          activeDetectionProgramId: program.id,
          draftProgram,
          status: draftProgram.status,
          mode: draftProgram.mode,
          version: draftProgram.version,
        },
      ];
    });
  }, [normalizedPrograms, selectedLanguage]);

  const handleGenerateProgram = useCallback(
    (language?: string) => {
      generateProgram.mutate(
        { standardId, ruleId, language },
        {
          onSuccess: async () => {
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: [
                  ...GET_ACTIVE_DETECTION_PROGRAMS_KEY,
                  standardId,
                  ruleId,
                ],
              }),
              queryClient.invalidateQueries({
                queryKey: [
                  ...GET_ALL_DETECTION_PROGRAMS_KEY,
                  standardId,
                  ruleId,
                ],
              }),
            ]);
            await refetchPrograms();
          },
          onError: (error) => {
            console.error('Failed to generate program', error, {
              standardId,
              ruleId,
              language,
            });
          },
        },
      );
    },
    [generateProgram, queryClient, refetchPrograms, ruleId, standardId],
  );

  const handleMakeDraftActive = useCallback(
    (draft: DraftCardData) => {
      const detectionProgramId = draft.draftProgram?.id;

      if (!detectionProgramId) {
        console.warn('Missing detection program id for draft activation', {
          draftId: draft.id,
        });
        return;
      }

      setActivatingDraftId(draft.id);
      activateDraft.mutate(
        {
          standardId,
          ruleId,
          activeDetectionProgramId: draft.activeDetectionProgramId,
          detectionProgramId: detectionProgramId as unknown as string,
        },
        {
          onSuccess: () => {
            void refetchPrograms();
          },
          onError: (error) => {
            console.error('Failed to activate detection draft', error, {
              draftId: draft.id,
            });
          },
          onSettled: () => {
            setActivatingDraftId(null);
          },
        },
      );
    },
    [activateDraft, refetchPrograms, ruleId, standardId],
  );

  const handleTestDraft = useCallback(
    (draft: DraftCardData | ActiveConfigurationCardData) => {
      setSelectedProgramForTest(draft);
      setIsTestModalOpen(true);
    },
    [],
  );

  const handleRetryDraftGeneration = useCallback(
    (draft: DraftCardData) => {
      handleGenerateProgram(draft.language);
    },
    [handleGenerateProgram],
  );

  const handleCloseTestModal = useCallback(() => {
    setIsTestModalOpen(false);
    setSelectedProgramForTest(null);
    setSandboxCode('');
    setTestResults(null);
  }, []);

  const handleSandboxCodeChange = useCallback((value: string) => {
    // Enforce 10,000 character hard limit
    if (value.length <= 10000) {
      setSandboxCode(value);
    }
  }, []);

  const handleTestSandbox = useCallback(() => {
    function getDetectionProgramId(): DetectionProgramId | undefined {
      if (
        isActiveConfigurationCardData(selectedProgramForTest) &&
        selectedProgramForTest.detectionProgram
      )
        return selectedProgramForTest.detectionProgram.id;
      if (isDraftCardData(selectedProgramForTest))
        return selectedProgramForTest.draftProgram?.id;
    }

    const detectionProgramId = getDetectionProgramId();

    if (!detectionProgramId) {
      console.error('No  program selected for testing');
      return;
    }

    testProgramExecution.mutate(
      {
        standardId,
        ruleId,
        detectionProgramId,
        sandboxCode,
      },
      {
        onSuccess: (violations) => {
          setTestResults(violations);
        },
        onError: (error) => {
          console.error('Failed to test program execution:', error);
          setTestResults([]);
        },
      },
    );
  }, [
    selectedProgramForTest,
    sandboxCode,
    testProgramExecution,
    standardId,
    ruleId,
  ]);

  const testDraftCommand = useMemo(() => {
    if (!selectedProgramForTest || !standardSlug) {
      return null;
    }

    const rawLanguage =
      selectedProgramForTest.draftProgram?.language ??
      selectedProgramForTest.language;

    const normalizedLanguage =
      typeof rawLanguage === 'string' ? rawLanguage.toLowerCase() : undefined;

    if (!normalizedLanguage) {
      return null;
    }

    const isDraft = !isActiveConfigurationCardData(selectedProgramForTest);

    return `packmind-cli lint ${isDraft ? '--draft ' : ''}--rule=@${standardSlug}/${ruleId} --language=${normalizedLanguage}`;
  }, [selectedProgramForTest, standardSlug, ruleId]);

  const sandboxLanguage = useMemo(() => {
    if (!selectedProgramForTest) {
      return undefined;
    }

    const rawLanguage =
      selectedProgramForTest.draftProgram?.language ??
      selectedProgramForTest.language;

    return typeof rawLanguage === 'string' ? rawLanguage : undefined;
  }, [selectedProgramForTest]);

  // Get modal title with version and type
  const testModalTitle = useMemo(() => {
    if (!selectedProgramForTest) {
      return 'Test Program';
    }

    const isDraft = isDraftCardData(selectedProgramForTest);
    const version = isDraft
      ? selectedProgramForTest.draftProgram?.version
      : selectedProgramForTest.detectionProgram?.version;

    if (isDraft) {
      return `Test Draft Program${version ? ` (v${version})` : ''}`;
    }
    return `Test Active Version${version ? ` (v${version})` : ''}`;
  }, [selectedProgramForTest]);

  return (
    <PMVStack alignItems="stretch" gap={6} width="full">
      <DetectionProgramConfiguration
        standardId={standardId}
        standardName={standardName}
        ruleId={ruleId}
        detectionLanguages={detectionLanguages}
        selectedLanguage={selectedLanguage}
        activeConfigurations={activeConfigurations}
        draftPrograms={draftPrograms}
        isLoadingActivePrograms={isLoadingActivePrograms}
        isActiveProgramsError={isActiveProgramsError}
        onGenerateProgram={handleGenerateProgram}
        isGeneratingProgram={generateProgram.isPending}
        onTestProgram={handleTestDraft}
        onActivateDraft={handleMakeDraftActive}
        activatingDraftId={activatingDraftId}
        isActivatingDraft={activateDraft.isPending}
        onRetryDraft={handleRetryDraftGeneration}
        onNavigateToExamples={onNavigateToExamples}
      />

      <PMDialog.Root
        open={isTestModalOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            handleCloseTestModal();
          }
        }}
      >
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content maxW="800px">
            <PMDialog.Header>
              <PMHStack gap={3} alignItems="center">
                <PMDialog.Title>{testModalTitle}</PMDialog.Title>
                {selectedProgramForTest &&
                  isDraftCardData(selectedProgramForTest) && (
                    <PMBadge colorPalette="gray" size="sm">
                      Draft
                    </PMBadge>
                  )}
                {selectedProgramForTest &&
                  isActiveConfigurationCardData(selectedProgramForTest) && (
                    <PMBadge colorPalette="green" size="sm">
                      Active
                    </PMBadge>
                  )}
              </PMHStack>
              <PMDialog.CloseTrigger onClick={handleCloseTestModal} />
            </PMDialog.Header>
            <PMDialog.Body>
              <PMVStack alignItems="stretch" gap={6}>
                <PMVStack alignItems="stretch" gap={3}>
                  <PMText>
                    Copy and run this command in your terminal to test the
                    {isDraftCardData(selectedProgramForTest)
                      ? ' draft'
                      : ' active version'}
                    .
                  </PMText>
                  {testDraftCommand ? (
                    <CopiableTextField value={testDraftCommand} readOnly />
                  ) : (
                    <PMText color="error" fontSize="sm">
                      Unable to build the CLI command. Ensure the standard
                      information is available and try again.
                    </PMText>
                  )}
                </PMVStack>

                <PMVStack alignItems="stretch" gap={3}>
                  <PMHStack justify="space-between" align="center">
                    <PMHeading level="h5">Sandbox</PMHeading>
                    <PMText color="faded" fontSize="sm">
                      {sandboxCode.length} / 10,000 characters
                    </PMText>
                  </PMHStack>
                  <PMBox>
                    <PMCodeMirror
                      value={sandboxCode}
                      onChange={handleSandboxCodeChange}
                      editable={true}
                      language={sandboxLanguage}
                      placeholder="Enter code to test..."
                      height="300px"
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: false,
                        dropCursor: false,
                        allowMultipleSelections: false,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: false,
                        searchKeymap: false,
                      }}
                    />
                  </PMBox>
                  {testResults !== null && (
                    <PMBox>
                      <PMHeading level="h6" mb={2}>
                        Test Results
                      </PMHeading>
                      <PMVStack alignItems="stretch" gap={2}>
                        <PMText>
                          {testResults.length} violation
                          {testResults.length !== 1 ? 's' : ''} detected.
                        </PMText>
                        {testResults.length > 0 && (
                          <PMText fontSize="sm">
                            Errors found line(s){' '}
                            {testResults.map((v) => v.line + 1).join(', ')}
                          </PMText>
                        )}
                      </PMVStack>
                    </PMBox>
                  )}
                </PMVStack>
              </PMVStack>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMHStack gap={2}>
                <PMButton
                  width="min"
                  onClick={handleTestSandbox}
                  disabled={sandboxCode.length === 0}
                  loading={testProgramExecution.isPending}
                >
                  Test
                </PMButton>
                <PMButton
                  width="min"
                  variant="outline"
                  onClick={handleCloseTestModal}
                >
                  Close
                </PMButton>
              </PMHStack>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMDialog.Root>
    </PMVStack>
  );
};

function isDraftCardData(tbd: unknown): tbd is DraftCardData {
  return (
    tbd !== null &&
    typeof tbd === 'object' &&
    (tbd as DraftCardData).draftProgram !== undefined &&
    (tbd as DraftCardData).draftProgram !== null
  );
}

function isActiveConfigurationCardData(
  tbd: unknown,
): tbd is ActiveConfigurationCardData {
  return (
    tbd !== null &&
    typeof tbd === 'object' &&
    (tbd as ActiveConfigurationCardData).detectionProgram !== undefined
  );
}

export { ProgramEditor };
