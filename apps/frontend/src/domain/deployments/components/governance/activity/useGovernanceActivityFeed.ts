import { useMemo } from 'react';
import {
  type ActivityEntry,
  buildStubActivityEntries,
} from './stubActivityEntries';

export interface GovernanceActivityFeed {
  entries: ActivityEntry[];
  isLoading: boolean;
  isError: boolean;
}

export function useGovernanceActivityFeed(): GovernanceActivityFeed {
  const entries = useMemo(() => buildStubActivityEntries(Date.now()), []);
  return { entries, isLoading: false, isError: false };
}
