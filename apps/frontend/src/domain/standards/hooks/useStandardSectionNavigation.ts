import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { routes } from '../../../shared/utils/routes';
import {
  extractRuleIdFromNavKey,
  isRuleNavKey,
  NavKey,
  makeRuleNavKey,
} from '../utils/standardNavigation';
import type { Rule } from '@packmind/shared';

type UseStandardSectionNavigationArgs = {
  standardId: string;
  orgSlug?: string;
  spaceSlug?: string;
  rules?: Rule[];
  rulesLoading: boolean;
  rulesError: boolean;
};

export const useStandardSectionNavigation = ({
  standardId,
  orgSlug,
  spaceSlug,
  rules,
  rulesLoading,
  rulesError,
}: UseStandardSectionNavigationArgs) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPathForNavKey = useCallback(
    (navKey: NavKey): string | null => {
      if (!orgSlug || !spaceSlug) {
        return null;
      }

      if (navKey === 'summary') {
        return routes.space.toStandardSummary(orgSlug, spaceSlug, standardId);
      }

      if (navKey === 'deployment') {
        return routes.space.toStandardDeployment(
          orgSlug,
          spaceSlug,
          standardId,
        );
      }

      const ruleId = extractRuleIdFromNavKey(navKey);
      if (!ruleId) {
        return null;
      }

      return routes.space.toStandardRule(
        orgSlug,
        spaceSlug,
        standardId,
        ruleId,
      );
    },
    [orgSlug, spaceSlug, standardId],
  );

  const currentRuleId = useMemo(() => {
    const match = location.pathname.match(/\/rule\/([^/]+)$/);
    return match ? match[1] : undefined;
  }, [location.pathname]);

  const activeSection: NavKey = useMemo(() => {
    if (currentRuleId) {
      return makeRuleNavKey(currentRuleId);
    }

    if (location.pathname.endsWith('/deployment')) {
      return 'deployment';
    }

    return 'summary';
  }, [currentRuleId, location.pathname]);

  const summaryPath = useMemo(
    () => getPathForNavKey('summary'),
    [getPathForNavKey],
  );

  const showSummaryActions =
    summaryPath !== null
      ? location.pathname === summaryPath
      : activeSection === 'summary';

  const showRuleActions = summaryPath !== null && isRuleNavKey(activeSection);

  const handleSectionSelect = (value: NavKey) => {
    const targetPath = getPathForNavKey(value);
    if (!targetPath) {
      return;
    }

    if (targetPath === location.pathname) {
      return;
    }

    navigate(targetPath);
  };

  const handleBackToSummary = () => {
    if (!summaryPath || summaryPath === location.pathname) {
      return;
    }

    navigate(summaryPath);
  };

  useEffect(() => {
    if (!currentRuleId) {
      return;
    }

    if (rulesLoading || rulesError) {
      return;
    }

    const hasRule = rules?.some((rule) => rule.id === currentRuleId);

    if (!hasRule) {
      const nextSummaryPath = getPathForNavKey('summary');
      if (nextSummaryPath) {
        navigate(nextSummaryPath, { replace: true });
      }
    }
  }, [
    currentRuleId,
    rules,
    rulesLoading,
    rulesError,
    navigate,
    getPathForNavKey,
  ]);

  return {
    activeSection,
    currentRuleId,
    showSummaryActions,
    showRuleActions,
    summaryPath,
    handleSectionSelect,
    handleBackToSummary,
  };
};
