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
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  isFeatureFlagEnabled,
  SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY,
} from '@packmind/feature-flags';

/**
 * Which information architecture a space's sidebar renders: the current one,
 * or the plugin-first one prototyped in the playground. The two are shipped
 * side by side on purpose — demos and the e2e suite keep the current
 * navigation while the new one is being assembled.
 */
export type SpaceNavMode = 'today' | 'plugin-first';

/**
 * Holds a mode somebody asked for, and nothing else.
 *
 * The `.v2` is the point. The first key was written on every mount rather than
 * on a choice, so it reads `today` for everyone who has ever opened the app,
 * including people who never saw the switch. Reading it would out-vote the
 * default below for the whole beta audience, so v1 is left where it is and
 * ignored.
 */
const SPACE_NAV_MODE_KEY = 'space-nav-mode.v2';

const FALLBACK_MODE: SpaceNavMode = 'today';

interface SpaceNavModeContextValue {
  mode: SpaceNavMode;
  setMode: (mode: SpaceNavMode) => void;
}

const SpaceNavModeContext = createContext<SpaceNavModeContextValue>({
  mode: FALLBACK_MODE,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setMode: () => {},
});

export function useSpaceNavMode(): SpaceNavModeContextValue {
  return useContext(SpaceNavModeContext);
}

function isSpaceNavMode(value: string | null): value is SpaceNavMode {
  return value === 'today' || value === 'plugin-first';
}

/**
 * What somebody who has never chosen a mode gets. The flag decides: its
 * audience lands on the plugin-first navigation, everyone else on the current
 * one. It stays a default and not a lock — the switch moves either way, and a
 * mode that was chosen wins over this.
 */
function defaultMode(userEmail?: string | null): SpaceNavMode {
  return isFeatureFlagEnabled({
    featureKeys: [SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail,
  })
    ? 'plugin-first'
    : FALLBACK_MODE;
}

/**
 * The mode this person picked, or null when they have picked none — which is
 * the only way to tell "wants the current navigation" from "never said".
 */
function readChosenMode(): SpaceNavMode | null {
  try {
    const stored = localStorage.getItem(SPACE_NAV_MODE_KEY);
    return isSpaceNavMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

function rememberChosenMode(mode: SpaceNavMode): void {
  try {
    localStorage.setItem(SPACE_NAV_MODE_KEY, mode);
  } catch {
    // Storage unavailable — the choice won't survive a reload, but it holds
    // for the session.
  }
}

/**
 * The one resolution rule, so a component and a loader cannot disagree about
 * which mode is active: an explicit `nav` wins over a mode that was chosen,
 * which wins over the default for this person.
 */
function pickMode(
  requested: string | null,
  userEmail?: string | null,
): SpaceNavMode {
  if (isSpaceNavMode(requested)) {
    return requested;
  }
  return readChosenMode() ?? defaultMode(userEmail);
}

/**
 * The same answer for code that has a query string rather than hooks — a route
 * `clientLoader` deciding where to send a landing page, for instance. The
 * email is what makes the default audience-dependent; leaving it out answers
 * for somebody the flag does not cover.
 */
export function resolveSpaceNavMode(
  search: string,
  userEmail?: string | null,
): SpaceNavMode {
  return pickMode(new URLSearchParams(search).get('nav'), userEmail);
}

/**
 * Holds the mode for the whole authenticated layout. `?nav=plugin-first` (or
 * `?nav=today`) wins over a mode that was chosen and is stored as one, so a
 * link is enough to pin a demo to one architecture — which is also how an e2e
 * spec pins it, without needing the feature flag.
 *
 * `userEmail` is read once, when the provider mounts, so it has to be known by
 * then: the layout above renders a skeleton until the user is loaded, which is
 * what makes that true and keeps the first paint from flipping architecture.
 */
export function SpaceNavModeProvider({
  userEmail,
  children,
}: Readonly<{ userEmail?: string | null; children: ReactNode }>) {
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get('nav');
  const [mode, setMode] = useState<SpaceNavMode>(() =>
    pickMode(requestedMode, userEmail),
  );

  /*
   * A `nav` in the URL is as much a choice as flipping the switch, so it is
   * stored as one. The parameter does not survive an internal link, and
   * without this a pinned demo would come undone on the first click.
   */
  useEffect(() => {
    if (isSpaceNavMode(requestedMode)) {
      setMode(requestedMode);
      rememberChosenMode(requestedMode);
    }
  }, [requestedMode]);

  /*
   * Only a choice is written. Storing the resolved mode instead — which is what
   * the first version did — would freeze today's default into every browser and
   * make the flag unable to move anybody later.
   */
  const handleSetMode = useCallback((next: SpaceNavMode) => {
    setMode(next);
    rememberChosenMode(next);
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
