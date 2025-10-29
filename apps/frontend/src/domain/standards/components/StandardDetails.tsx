import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';
import { PMPage, PMVStack, PMText, PMAlert, PMGrid, PMBox } from '@packmind/ui';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetStandardsQuery,
  useGetStandardVersionsQuery,
  useGetRulesByStandardIdQuery,
  useDeleteStandardMutation,
} from '../api/queries/StandardsQueries';

import { Rule, Standard } from '@packmind/shared';
import { STANDARD_MESSAGES } from '../constants/messages';
import { routes } from '../../../shared/utils/routes';
import { StandardVersionHistoryHeader } from './StandardVersionHistoryHeader';
import { StandardDetailsSidebar } from './StandardDetailsSidebar';
import { useStandardSectionNavigation } from '../hooks/useStandardSectionNavigation';
import { RuleActions, SummaryActions } from './StandardDetailsActions';
import {
  GET_ACTIVE_DETECTION_PROGRAMS_KEY,
  GET_ALL_DETECTION_PROGRAMS_KEY,
  GET_RULE_DETECTION_ASSESSMENT_KEY,
  GET_RULE_LANGUAGE_DETECTION_STATUS_KEY,
  GET_STANDARD_RULES_DETECTION_STATUS_KEY,
} from '../../detection/api/queryKeys';
import { detectionGateway } from '../../detection/api/gateways';
import { useGetStandardRulesDetectionStatusQuery } from '../../detection/api/queries/DetectionProgramQueries';
import { useSSESubscription } from '../../sse';

interface StandardDetailsProps {
  standard: Standard;
  orgSlug?: string;
}

export type StandardDetailsOutletContext = {
  standard: Standard;
  defaultPath: string;
  rules?: Rule[];
  rulesLoading: boolean;
  rulesError: boolean;
  ruleDetectionLanguages: Record<string, string[]>;
};

export const StandardDetails = ({
  standard,
  orgSlug,
}: StandardDetailsProps) => {
  const navigate = useNavigate();
  const { spaceSlug } = useParams<{ spaceSlug?: string }>();
  const defaultPath = `.packmind/standards/${standard.slug}.md`;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const programOwnershipRef = useRef(
    new Map<string, { ruleId: string; language?: string | null }>(),
  );

  const { data: versions, isLoading: versionsLoading } =
    useGetStandardVersionsQuery(standard.id);

  const {
    data: availableStandards = {
      standards: [],
    },
    isLoading: standardsLoading,
  } = useGetStandardsQuery();

  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useGetRulesByStandardIdQuery(standard.id);

  const { data: rulesDetectionStatuses } =
    useGetStandardRulesDetectionStatusQuery(standard.id);

  useEffect(() => {
    programOwnershipRef.current.clear();
  }, [standard.id]);

  const {
    activeSection,
    showSummaryActions,
    showRuleActions,
    handleSectionSelect,
    handleBackToSummary,
  } = useStandardSectionNavigation({
    standardId: standard.id,
    orgSlug,
    spaceSlug,
    rules,
    rulesLoading,
    rulesError,
  });
  const sortedRules = useMemo<Rule[] | undefined>(() => {
    if (!rules) {
      return undefined;
    }

    return [...rules].sort((firstRule, secondRule) =>
      firstRule.content.localeCompare(secondRule.content, undefined, {
        sensitivity: 'base',
      }),
    );
  }, [rules]);

  const rulesList = useMemo<Rule[]>(
    () => sortedRules ?? rules ?? [],
    [sortedRules, rules],
  );

  const deleteStandardMutation = useDeleteStandardMutation();

  const ruleDetectionLanguages = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};

    if (!Array.isArray(rulesDetectionStatuses)) {
      return map;
    }

    for (const { ruleId, languages } of rulesDetectionStatuses) {
      const ruleIdString = ruleId ? String(ruleId) : '';
      if (!ruleIdString || !Array.isArray(languages)) {
        continue;
      }

      const languageSet = new Set<string>(map[ruleIdString] ?? []);
      for (const { language } of languages) {
        const languageString = language ? String(language).toUpperCase() : '';
        if (languageString) {
          languageSet.add(languageString);
        }
      }

      if (languageSet.size) {
        map[ruleIdString] = Array.from(languageSet).sort((first, second) =>
          first.localeCompare(second, undefined, { sensitivity: 'base' }),
        );
      }
    }

    return map;
  }, [rulesDetectionStatuses]);

  const programSubscriptionParams = useMemo<string[][]>(() => {
    const combos: string[][] = [];

    for (const [ruleIdString, languages] of Object.entries(
      ruleDetectionLanguages,
    )) {
      if (!Array.isArray(languages)) {
        continue;
      }

      languages.forEach((language) => {
        if (language) {
          combos.push([ruleIdString, language]);
        }
      });
    }

    return combos.sort((first, second) =>
      first.join(':').localeCompare(second.join(':'), undefined, {
        sensitivity: 'base',
      }),
    );
  }, [ruleDetectionLanguages]);

  const outletContext = useMemo<StandardDetailsOutletContext>(
    () => ({
      standard,
      defaultPath,
      rules: sortedRules,
      rulesLoading,
      rulesError,
      ruleDetectionLanguages,
    }),
    [
      standard,
      defaultPath,
      sortedRules,
      rulesLoading,
      rulesError,
      ruleDetectionLanguages,
    ],
  );

  const availableStandardOptions = useMemo<Standard[]>(() => {
    if (!availableStandards) {
      return [];
    }

    if (Array.isArray(availableStandards)) {
      return availableStandards;
    }

    if (
      'standards' in availableStandards &&
      Array.isArray(availableStandards.standards)
    ) {
      return availableStandards.standards;
    }

    return [];
  }, [availableStandards]);

  const resolveProgramOwnership = useCallback(
    async (
      programId: string,
    ): Promise<{ ruleId: string; language?: string | null } | null> => {
      if (!programId) {
        return null;
      }

      const cached = programOwnershipRef.current.get(programId);
      if (cached) {
        return cached;
      }

      for (const rule of rulesList) {
        const ruleIdString = String(rule.id);
        try {
          const programs = await queryClient.fetchQuery({
            queryKey: [
              ...GET_ACTIVE_DETECTION_PROGRAMS_KEY,
              String(standard.id),
              ruleIdString,
            ],
            queryFn: () =>
              detectionGateway.getActiveDetectionPrograms(
                String(standard.id),
                ruleIdString,
              ),
          });

          programs.forEach((program) => {
            const programLanguage =
              program.detectionProgram?.language ??
              program.draftDetectionProgram?.language ??
              program.language ??
              null;
            const languageString = programLanguage
              ? String(programLanguage).toUpperCase()
              : null;
            const activeId = program.detectionProgram?.id;
            if (activeId) {
              programOwnershipRef.current.set(String(activeId), {
                ruleId: ruleIdString,
                language: languageString,
              });
            }

            const draftId = program.draftDetectionProgram?.id;
            if (draftId) {
              programOwnershipRef.current.set(String(draftId), {
                ruleId: ruleIdString,
                language: languageString,
              });
            }
          });

          const refreshed = programOwnershipRef.current.get(programId);
          if (refreshed) {
            return refreshed;
          }
        } catch (error) {
          console.error('SSE: Failed to resolve program ownership', {
            standardId: String(standard.id),
            ruleId: ruleIdString,
            programId,
            error,
          });
        }
      }

      return null;
    },
    [queryClient, rulesList, standard.id],
  );

  const invalidateDetectionQueries = useCallback(
    async (ruleId: string, language?: string | null) => {
      const standardIdString = String(standard.id);
      const ruleIdString = String(ruleId);
      const tasks: Array<Promise<unknown>> = [
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ACTIVE_DETECTION_PROGRAMS_KEY,
            standardIdString,
            ruleIdString,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ALL_DETECTION_PROGRAMS_KEY,
            standardIdString,
            ruleIdString,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_RULE_LANGUAGE_DETECTION_STATUS_KEY,
            standardIdString,
            ruleIdString,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_STANDARD_RULES_DETECTION_STATUS_KEY,
            standardIdString,
          ],
        }),
      ];

      if (language) {
        const languageString = String(language);
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: [
              ...GET_RULE_LANGUAGE_DETECTION_STATUS_KEY,
              standardIdString,
              ruleIdString,
              languageString,
            ],
          }),
        );
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: [
              ...GET_RULE_DETECTION_ASSESSMENT_KEY,
              standardIdString,
              ruleIdString,
              languageString,
            ],
          }),
        );
      }

      await Promise.all(tasks);
    },
    [queryClient, standard.id],
  );

  const handleProgramStatusEvent = useCallback(
    (event: MessageEvent) => {
      try {
        if (event?.type !== 'PROGRAM_STATUS_CHANGE') {
          return;
        }

        const parsed = JSON.parse(event.data);
        const payload =
          parsed && typeof parsed === 'object' && 'programId' in parsed
            ? (parsed as {
                programId?: string | number;
                ruleId?: string | number;
                language?: string;
              })
            : (parsed?.data as {
                programId?: string | number;
                ruleId?: string | number;
                language?: string;
              });

        if (!payload) {
          return;
        }

        const programId = payload?.programId ? String(payload.programId) : '';
        const ruleIdFromEvent = payload?.ruleId ? String(payload.ruleId) : '';
        const languageFromEvent = payload?.language
          ? String(payload.language)
          : '';

        let targetRuleId = ruleIdFromEvent;
        let targetLanguage: string | null = languageFromEvent || null;

        if (!targetRuleId && programId) {
          void resolveProgramOwnership(programId)
            .then((ownership) => {
              if (!ownership) {
                return;
              }
              targetRuleId = ownership.ruleId;
              if (!targetLanguage) {
                targetLanguage = ownership.language ?? null;
              }

              if (!targetRuleId) {
                return;
              }

              return invalidateDetectionQueries(targetRuleId, targetLanguage);
            })
            .catch((error) => {
              console.error('SSE: Failed to handle program status event', {
                error,
              });
            });
        } else if (targetRuleId) {
          void invalidateDetectionQueries(targetRuleId, targetLanguage).catch(
            (error) => {
              console.error('SSE: Failed to handle program status event', {
                error,
              });
            },
          );
        }
      } catch (error) {
        console.error('SSE: Failed to handle program status event', {
          error,
        });
      }
    },
    [invalidateDetectionQueries, resolveProgramOwnership],
  );

  useSSESubscription({
    eventType: 'PROGRAM_STATUS_CHANGE',
    paramsList: programSubscriptionParams,
    onEvent: handleProgramStatusEvent,
    enabled: programSubscriptionParams.length > 0,
  });

  useSSESubscription({
    eventType: 'PROGRAM_STATUS_CHANGE',
    params: [],
    onEvent: handleProgramStatusEvent,
    enabled: programSubscriptionParams.length === 0,
  });

  // Early return if no standardId is provided
  if (!standard) {
    return <PMText color="error">No standard ID provided.</PMText>;
  }

  const handleDelete = async () => {
    if (!standard) return;

    try {
      await deleteStandardMutation.mutateAsync(standard.id);
      setDeleteAlert({
        type: 'success',
        message: STANDARD_MESSAGES.success.deleted,
      });
      setDeleteModalOpen(false);

      // Auto-dismiss success alert and navigate back after 2 seconds
      setTimeout(() => {
        setDeleteAlert(null);
        if (orgSlug && spaceSlug) {
          navigate(routes.space.toStandards(orgSlug, spaceSlug));
          return;
        }
        navigate('..');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete standard:', error);
      setDeleteAlert({
        type: 'error',
        message: STANDARD_MESSAGES.error.deleteFailed,
      });
      setDeleteModalOpen(false);
    }
  };

  const handleStandardSelect = (nextStandardId: string) => {
    if (!orgSlug || !spaceSlug) {
      return;
    }

    navigate(
      routes.space.toStandardSummary(orgSlug, spaceSlug, nextStandardId),
    );
  };

  const handleEdit = () => {
    if (!orgSlug || !spaceSlug) {
      return;
    }

    navigate(routes.space.toStandardEdit(orgSlug, spaceSlug, standard.id));
  };

  const handleDeleteRequest = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteDialogChange = (isOpen: boolean) => {
    setDeleteModalOpen(isOpen);
  };

  return (
    <PMGrid
      height="full"
      gridTemplateColumns={{
        base: 'minmax(240px, 270px) minmax(0, 1fr)',
      }}
      gap={6}
      alignItems="start"
      overflowX="auto"
    >
      <StandardDetailsSidebar
        standard={standard}
        standards={availableStandardOptions}
        activeSection={activeSection}
        onSectionSelect={handleSectionSelect}
        onStandardChange={handleStandardSelect}
        isStandardSelectDisabled={!orgSlug || !spaceSlug}
        standardsLoading={standardsLoading}
        rules={sortedRules}
        rulesLoading={rulesLoading}
        rulesError={rulesError}
      />

      <PMPage
        title={standard.name}
        breadcrumbComponent={
          <StandardVersionHistoryHeader
            standard={standard}
            versions={versions}
            isLoading={versionsLoading}
            orgSlug={orgSlug}
          />
        }
        isFullWidth
        actions={
          showSummaryActions ? (
            <SummaryActions
              onEdit={handleEdit}
              onDeleteRequest={handleDeleteRequest}
              onDeleteDialogChange={handleDeleteDialogChange}
              onConfirmDelete={handleDelete}
              isDeleteDialogOpen={deleteModalOpen}
              isDeleting={deleteStandardMutation.isPending}
              deleteDialogMessage={
                standard
                  ? STANDARD_MESSAGES.confirmation.deleteStandard(standard.name)
                  : 'Are you sure you want to delete this standard?'
              }
            />
          ) : showRuleActions ? (
            <RuleActions onBackToSummary={handleBackToSummary} />
          ) : undefined
        }
      >
        {deleteAlert && (
          <PMAlert.Root status={deleteAlert.type} width="lg" mb={4}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        )}

        <PMVStack align="stretch" gap={6}>
          <PMBox width="full">
            <Outlet context={outletContext} />
          </PMBox>
        </PMVStack>
      </PMPage>
    </PMGrid>
  );
};
