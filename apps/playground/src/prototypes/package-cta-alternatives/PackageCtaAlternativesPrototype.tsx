import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMGrid,
  PMHStack,
  PMNativeSelect,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { snapshotFor } from './data';
import type {
  Destination,
  HeaderApproach,
  LogEntry,
  PackageSnapshot,
  Scenario,
} from './types';
import { PackagePane } from './components/PackagePane';
import { ApproachNote } from './components/ApproachNote';

const APPROACHES: Array<{ label: string; value: HeaderApproach }> = [
  { label: 'Today — Distribute / Update N', value: 'today' },
  { label: 'A — No header action', value: 'none' },
  { label: 'B — Create release', value: 'release' },
  { label: 'C — Reach summary (a fact)', value: 'reach' },
  { label: 'D — Install… (hand-off)', value: 'install' },
];

const SCENARIOS: Array<{ label: string; value: Scenario }> = [
  { label: 'Never distributed', value: 'nowhere' },
  { label: 'Up to date everywhere', value: 'aligned' },
  { label: '3 destinations behind', value: 'behind' },
  { label: 'Unreleased changes + 2 behind', value: 'unreleased' },
  { label: '2 failures + 3 behind', value: 'failing' },
  { label: '240 destinations, 4 need a hand', value: 'scale' },
];

/**
 * Five answers to one question: what does the package pane's header do, once
 * `Distribute` and `Update N destinations` have moved down to the Distribution
 * tab where their verbs belong.
 *
 * The scenario switch is not decoration. The complaint about today's control is
 * that it says three different things in three different states, so an approach
 * has to be read in all of them — and the gesture counter beside it answers the
 * one measurable objection to the move: the header's catch-up is one click, and
 * anything that costs four has made the common case worse.
 */
export default function PackageCtaAlternativesPrototype() {
  const [approach, setApproach] = useState<HeaderApproach>('none');
  const [scenario, setScenario] = useState<Scenario>('behind');
  const [snapshot, setSnapshot] = useState<PackageSnapshot>(() =>
    snapshotFor('behind'),
  );
  const [gestures, setGestures] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = useRef(0);

  // Switching either control puts the package back as it was, so a measurement
  // taken under one approach is taken under the same conditions as the next.
  useEffect(() => {
    setSnapshot(snapshotFor(scenario));
    setGestures(0);
    setLog([]);
  }, [scenario, approach]);

  const appendLog = useCallback((text: string) => {
    logId.current += 1;
    setLog((previous) =>
      [{ id: logId.current, text }, ...previous].slice(0, 6),
    );
  }, []);

  /**
   * Every click on something clickable inside the pane, counted. Capturing on
   * the container rather than threading a callback through nine components:
   * the number is a property of the surface, not of any control on it.
   */
  const countGesture = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('button, a, input, [role="checkbox"], [role="menuitem"]')
    ) {
      setGestures((previous) => previous + 1);
    }
  };

  const markUpToDate = useCallback((destinations: readonly Destination[]) => {
    const ids = new Set(destinations.map((destination) => destination.id));
    setSnapshot((previous) => ({
      ...previous,
      destinations: previous.destinations.map((destination) =>
        ids.has(destination.id)
          ? {
              ...destination,
              state: 'up-to-date' as const,
              version: previous.currentVersion ?? '0.1.0',
              note: undefined,
              canReleaseAndUpdate: false,
            }
          : destination,
      ),
    }));
  }, []);

  const cutRelease = useCallback(() => {
    setSnapshot((previous) => {
      const [major, minor] = (previous.currentVersion ?? '0.0.0').split('.');
      const version = previous.currentVersion
        ? `${major}.${Number(minor) + 1}.0`
        : '0.1.0';
      return {
        ...previous,
        currentVersion: version,
        changesSinceRelease: 0,
        /*
         * A cut does not move anything on its own: the rows that were sitting
         * on live content are now simply behind the version that exists. That
         * is the whole reason `Release & Update` is one gesture and not two.
         */
        destinations: previous.destinations.map((destination) =>
          destination.canReleaseAndUpdate
            ? {
                ...destination,
                state: 'behind' as const,
                canReleaseAndUpdate: false,
              }
            : destination,
        ),
      };
    });
  }, []);

  return (
    <PMBox height="100%" display="flex" flexDirection="column" minH={0}>
      <PMBox
        paddingX={6}
        paddingY={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        bg="background.secondary"
        flexShrink={0}
      >
        <PMHStack gap={6} align="center" wrap="wrap">
          <Field label="Header slot">
            <PMNativeSelect
              items={APPROACHES}
              value={approach}
              onChange={(event) =>
                setApproach(event.target.value as HeaderApproach)
              }
              size="sm"
              width="260px"
            />
          </Field>
          <Field label="Package state">
            <PMNativeSelect
              items={SCENARIOS}
              value={scenario}
              onChange={(event) => setScenario(event.target.value as Scenario)}
              size="sm"
              width="260px"
            />
          </Field>
          <PMHStack gap={2} align="center">
            <PMText variant="small" color="secondary">
              Gestures
            </PMText>
            <PMText variant="body-important" fontVariantNumeric="tabular-nums">
              {gestures}
            </PMText>
            <PMButton
              variant="tertiary"
              size="xs"
              onClick={() => setGestures(0)}
            >
              Reset
            </PMButton>
          </PMHStack>
          <PMText variant="small" color="faded" flex="1" minW="20ch">
            Try it: reset the counter, then push every destination that is
            behind. Switch approach and do it again.
          </PMText>
        </PMHStack>
      </PMBox>

      <PMGrid
        gridTemplateColumns="1fr minmax(300px, 360px)"
        gap={5}
        padding={5}
        flex="1"
        minH={0}
        overflow="hidden"
      >
        <PMBox minH={0} overflowY="auto" onClickCapture={countGesture}>
          <PackagePane
            approach={approach}
            snapshot={snapshot}
            onUpdate={markUpToDate}
            onRelease={cutRelease}
            onLog={appendLog}
          />
        </PMBox>

        <PMVStack align="stretch" gap={4} minH={0} overflowY="auto">
          <ApproachNote approach={approach} />
          <PMVStack
            align="stretch"
            gap={2}
            borderWidth="1px"
            borderColor="border.tertiary"
            borderRadius="md"
            padding={4}
            bg="background.primary"
          >
            <PMText variant="small-important" color="secondary">
              What just happened
            </PMText>
            {log.length === 0 ? (
              <PMText variant="small" color="faded">
                Nothing yet.
              </PMText>
            ) : (
              log.map((entry) => (
                <PMText key={entry.id} variant="small" color="secondary">
                  {entry.text}
                </PMText>
              ))
            )}
          </PMVStack>
        </PMVStack>
      </PMGrid>
    </PMBox>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <PMHStack gap={2} align="center">
      <PMText variant="small" color="secondary">
        {label}
      </PMText>
      {children}
    </PMHStack>
  );
}
