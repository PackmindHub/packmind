import { useSearchParams } from 'react-router';
import { useCallback, useState, useEffect, useRef } from 'react';
import { TimePeriod, TargetId } from '@packmind/types';

export type ViewType = 'organization' | 'repository' | 'target';

export const TimePeriods: Record<TimePeriod, TimePeriod> = {
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_MONTH: 'LAST_MONTH',
  LAST_3_MONTHS: 'LAST_3_MONTHS',
};

type RepositorySelection = {
  owner: string;
  repo: string;
} | null;

export const useAnalyticsUrlState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMount = useRef(true);

  // Parse URL state helpers
  const parseTimePeriodFromUrl = (): TimePeriod => {
    const timePeriod = searchParams.get('timePeriod') as TimePeriod;
    return Object.values(TimePeriods).includes(timePeriod)
      ? timePeriod
      : TimePeriods.LAST_3_MONTHS;
  };

  const parseViewFromUrl = (): ViewType => {
    const view = searchParams.get('view') as ViewType;
    if (view === 'repository') return 'repository';
    if (view === 'target') return 'target';
    return 'organization';
  };

  const parseRepositoryFromUrl = (): RepositorySelection => {
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    if (!owner || !repo) return null;
    return {
      owner: decodeURIComponent(owner),
      repo: decodeURIComponent(repo),
    };
  };

  const parseTargetFromUrl = (): TargetId | null => {
    const targetId = searchParams.get('targetId') as TargetId;
    return targetId || null;
  };

  // Local state for filters
  const [timePeriod, setTimePeriodState] = useState<TimePeriod>(
    parseTimePeriodFromUrl,
  );
  const [view, setViewState] = useState<ViewType>(parseViewFromUrl);
  const [repository, setRepositoryState] = useState<RepositorySelection>(
    parseRepositoryFromUrl,
  );
  const [target, setTargetState] = useState<TargetId | null>(
    parseTargetFromUrl,
  );

  // Sync state from URL changes (browser back/forward, direct URL edits)
  useEffect(() => {
    const urlTimePeriod = parseTimePeriodFromUrl();
    const urlView = parseViewFromUrl();
    const urlRepository = parseRepositoryFromUrl();
    const urlTarget = parseTargetFromUrl();

    // Only update state if URL values are different from current state
    if (urlTimePeriod !== timePeriod) {
      setTimePeriodState(urlTimePeriod);
    }
    if (urlView !== view) {
      setViewState(urlView);
    }
    if (JSON.stringify(urlRepository) !== JSON.stringify(repository)) {
      setRepositoryState(urlRepository);
    }
    if (urlTarget !== target) {
      setTargetState(urlTarget);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync URL from state changes (user interactions)
  useEffect(() => {
    // Skip URL update on initial mount to avoid unnecessary navigation
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // Update time period
      newParams.set('timePeriod', timePeriod);

      // Update view
      newParams.set('view', view);

      // Update repository
      if (repository) {
        newParams.set('owner', encodeURIComponent(repository.owner));
        newParams.set('repo', encodeURIComponent(repository.repo));
      } else {
        newParams.delete('owner');
        newParams.delete('repo');
      }

      // Update target
      if (target) {
        newParams.set('targetId', target);
      } else {
        newParams.delete('targetId');
      }

      return newParams;
    });
  }, [timePeriod, view, repository, target, setSearchParams]);

  // Update functions that modify local state
  const setTimePeriod = useCallback((newTimePeriod: TimePeriod) => {
    setTimePeriodState(newTimePeriod);
  }, []);

  const setRepository = useCallback(
    (owner: string | null, repo: string | null) => {
      if (owner && repo) {
        setRepositoryState({ owner, repo });
        // Clear target when changing repository
        setTargetState(null);
      } else {
        setRepositoryState(null);
        // Clear target when clearing repository
        setTargetState(null);
      }
    },
    [],
  );

  const setTarget = useCallback((targetId: TargetId | null) => {
    setTargetState(targetId);
    // Ensure view is set to target when selecting a target
    if (targetId) {
      setViewState('target');
    }
  }, []);

  const setView = useCallback((newView: ViewType) => {
    setViewState(newView);

    // Clear dependent state when changing views
    if (newView === 'organization') {
      setRepositoryState(null);
      setTargetState(null);
    } else if (newView === 'repository') {
      setTargetState(null);
    }
  }, []);

  // Initialize URL params if missing (idempotent)
  const initializeUrlParams = useCallback(() => {
    setSearchParams(
      (prev) => {
        const currentView = prev.get('view');
        const currentTimePeriod = prev.get('timePeriod');

        if (!currentView || !currentTimePeriod) {
          const newParams = new URLSearchParams(prev);
          if (!currentTimePeriod) {
            newParams.set('timePeriod', TimePeriods.LAST_3_MONTHS);
          }
          if (!currentView) {
            newParams.set('view', 'organization');
          }
          return newParams;
        }
        return prev;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return {
    timePeriod,
    view,
    repository,
    target,
    setTimePeriod,
    setRepository,
    setTarget,
    setView,
    initializeUrlParams,
  };
};
