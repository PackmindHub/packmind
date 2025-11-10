import { useCallback, useMemo } from 'react';
import type { Standard } from '@packmind/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  GET_ACTIVE_DETECTION_PROGRAMS_KEY,
  GET_ALL_DETECTION_PROGRAMS_KEY,
  GET_RULE_DETECTION_ASSESSMENT_KEY,
  GET_RULE_LANGUAGE_DETECTION_STATUS_KEY,
  GET_STANDARD_RULES_DETECTION_STATUS_KEY,
} from '../api/queryKeys';
import { useGetStandardRulesDetectionStatusQuery } from '../api/queries/DetectionProgramQueries';
import { useSSESubscription } from '../../sse';

export { useGetStandardRulesDetectionStatusQuery };

export type StandardEditionFeatures = {
  ruleLanguages: Record<string, string[]>;
};

export const useStandardEditionFeatures = (
  standardId: Standard['id'],
): StandardEditionFeatures => {
  const queryClient = useQueryClient();
  const { data: rulesDetectionStatuses } =
    useGetStandardRulesDetectionStatusQuery(standardId);

  const { ruleLanguages, ruleLanguageSubscriptionParams } = useMemo<{
    ruleLanguages: Record<string, string[]>;
    ruleLanguageSubscriptionParams: string[][];
  }>(() => {
    const languagesByRule: Record<string, string[]> = {};
    const combos = new Set<string>();

    if (!Array.isArray(rulesDetectionStatuses)) {
      return {
        ruleLanguages: languagesByRule,
        ruleLanguageSubscriptionParams: [],
      };
    }

    for (const { ruleId, languages } of rulesDetectionStatuses) {
      const ruleIdString = ruleId ? String(ruleId) : '';
      if (!ruleIdString || !Array.isArray(languages)) {
        continue;
      }

      const languageSet = new Set<string>(languagesByRule[ruleIdString] ?? []);
      for (const { language } of languages) {
        const languageString = language ? String(language).toUpperCase() : '';
        if (languageString && !languageSet.has(languageString)) {
          languageSet.add(languageString);
          combos.add(`${ruleIdString}:${languageString}`);
        }
      }

      if (!languageSet.size) {
        continue;
      }

      languagesByRule[ruleIdString] = Array.from(languageSet).sort(
        (first, second) =>
          first.localeCompare(second, undefined, { sensitivity: 'base' }),
      );
    }

    const sortedCombos = Array.from(combos)
      .sort((first, second) =>
        first.localeCompare(second, undefined, { sensitivity: 'base' }),
      )
      .map((entry) => entry.split(':'));

    return {
      ruleLanguages: languagesByRule,
      ruleLanguageSubscriptionParams: sortedCombos,
    };
  }, [rulesDetectionStatuses]);

  const invalidateDetectionQueries = useCallback(
    async (ruleId: string, language?: string | null) => {
      const standardIdString = String(standardId);
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
    [queryClient, standardId],
  );

  const handleProgramStatusEvent = useCallback(
    (event: MessageEvent) => {
      try {
        if (event?.type !== 'PROGRAM_STATUS_CHANGE') {
          return;
        }

        const parsed = JSON.parse(event.data) as {
          ruleId?: string | number;
          language?: string;
        };

        const ruleIdFromEvent = parsed?.ruleId ? String(parsed.ruleId) : '';
        const languageFromEvent = parsed?.language
          ? String(parsed.language)
          : '';

        if (!ruleIdFromEvent) {
          return;
        }

        void invalidateDetectionQueries(
          ruleIdFromEvent,
          languageFromEvent || null,
        ).catch((error) => {
          console.error('SSE: Failed to handle program status event', {
            error,
          });
        });
      } catch (error) {
        console.error('SSE: Failed to handle program status event', {
          error,
        });
      }
    },
    [invalidateDetectionQueries],
  );

  const handleAssessmentStatusEvent = useCallback(
    (event: MessageEvent) => {
      try {
        if (event?.type !== 'ASSESSMENT_STATUS_CHANGE') {
          return;
        }

        const parsed = JSON.parse(event.data) as {
          ruleId?: string | number;
          language?: string;
        };

        const ruleIdFromEvent = parsed?.ruleId ? String(parsed.ruleId) : '';
        const languageFromEvent = parsed?.language
          ? String(parsed.language)
          : '';

        if (!ruleIdFromEvent) {
          return;
        }

        void invalidateDetectionQueries(
          ruleIdFromEvent,
          languageFromEvent || null,
        ).catch((error) => {
          console.error('SSE: Failed to handle assessment status event', {
            error,
          });
        });
      } catch (error) {
        console.error('SSE: Failed to handle assessment status event', {
          error,
        });
      }
    },
    [invalidateDetectionQueries],
  );

  useSSESubscription({
    eventType: 'PROGRAM_STATUS_CHANGE',
    paramsList: ruleLanguageSubscriptionParams,
    onEvent: handleProgramStatusEvent,
    enabled: ruleLanguageSubscriptionParams.length > 0,
  });

  useSSESubscription({
    eventType: 'ASSESSMENT_STATUS_CHANGE',
    paramsList: ruleLanguageSubscriptionParams,
    onEvent: handleAssessmentStatusEvent,
    enabled: ruleLanguageSubscriptionParams.length > 0,
  });

  return {
    ruleLanguages,
  };
};
