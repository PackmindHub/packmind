import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Which information architecture a space's sidebar renders: the current one,
 * or the plugin-first one prototyped in the playground. The two are shipped
 * side by side on purpose — demos and the e2e suite keep the current
 * navigation while the new one is being assembled.
 */
export type SpaceNavMode = 'today' | 'plugin-first';

const SPACE_NAV_MODE_KEY = 'space-nav-mode';

const DEFAULT_MODE: SpaceNavMode = 'today';

interface SpaceNavModeContextValue {
  mode: SpaceNavMode;
  setMode: (mode: SpaceNavMode) => void;
}

const SpaceNavModeContext = createContext<SpaceNavModeContextValue>({
  mode: DEFAULT_MODE,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setMode: () => {},
});

export function useSpaceNavMode(): SpaceNavModeContextValue {
  return useContext(SpaceNavModeContext);
}

function isSpaceNavMode(value: string | null): value is SpaceNavMode {
  return value === 'today' || value === 'plugin-first';
}

function readStoredMode(): SpaceNavMode {
  try {
    const stored = localStorage.getItem(SPACE_NAV_MODE_KEY);
    return isSpaceNavMode(stored) ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/**
 * Holds the mode for the whole authenticated layout. `?nav=plugin-first` (or
 * `?nav=today`) wins over what is stored and is written back, so a link is
 * enough to pin a demo to one architecture — which is also how an e2e spec
 * pins it, without needing the feature flag.
 */
export function SpaceNavModeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get('nav');
  const [mode, setMode] = useState<SpaceNavMode>(() =>
    isSpaceNavMode(requestedMode) ? requestedMode : readStoredMode(),
  );

  useEffect(() => {
    if (isSpaceNavMode(requestedMode)) {
      setMode(requestedMode);
    }
  }, [requestedMode]);

  useEffect(() => {
    try {
      localStorage.setItem(SPACE_NAV_MODE_KEY, mode);
    } catch {
      // Storage unavailable — the mode won't survive a reload, but the switch
      // still works for the session.
    }
  }, [mode]);

  const handleSetMode = useCallback((next: SpaceNavMode) => {
    setMode(next);
  }, []);

  const value = useMemo(
    () => ({ mode, setMode: handleSetMode }),
    [mode, handleSetMode],
  );

  return (
    <SpaceNavModeContext.Provider value={value}>
      {children}
    </SpaceNavModeContext.Provider>
  );
}
