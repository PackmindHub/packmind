import { useCallback, useMemo, useState } from 'react';
import {
  AutoUpdateProvider,
  DEFAULT_CRON,
  LOCAL_STORAGE_PROVIDER_KEY,
  SCHEDULE_PRESETS,
  ScheduleSelectorValue,
} from './constants';

const isProvider = (value: string | null): value is AutoUpdateProvider =>
  value === 'github' || value === 'gitlab';

const readStoredProvider = (): AutoUpdateProvider => {
  if (typeof window === 'undefined') return 'github';
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_PROVIDER_KEY);
    return isProvider(stored) ? stored : 'github';
  } catch {
    return 'github';
  }
};

const persistProvider = (provider: AutoUpdateProvider): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_PROVIDER_KEY, provider);
  } catch {
    // localStorage may be unavailable (private mode, disabled cookies); ignore.
  }
};

const resolveCron = (schedule: ScheduleSelectorValue): string => {
  if (schedule.kind === 'custom') {
    return schedule.isValid ? schedule.cron : DEFAULT_CRON;
  }
  return SCHEDULE_PRESETS[schedule.kind];
};

export interface IUseAutomateUpdatesState {
  provider: AutoUpdateProvider;
  setProvider: (provider: AutoUpdateProvider) => void;
  schedule: ScheduleSelectorValue;
  setSchedule: (next: ScheduleSelectorValue) => void;
  effectiveCron: string;
}

export const useAutomateUpdatesState = (): IUseAutomateUpdatesState => {
  const [provider, setProviderState] =
    useState<AutoUpdateProvider>(readStoredProvider);
  const [schedule, setScheduleState] = useState<ScheduleSelectorValue>({
    kind: 'weeknights',
  });

  const setProvider = useCallback((next: AutoUpdateProvider) => {
    setProviderState(next);
    persistProvider(next);
  }, []);

  const setSchedule = useCallback((next: ScheduleSelectorValue) => {
    setScheduleState(next);
  }, []);

  const effectiveCron = useMemo(() => resolveCron(schedule), [schedule]);

  return {
    provider,
    setProvider,
    schedule,
    setSchedule,
    effectiveCron,
  };
};
