import {
  PMBox,
  PMHStack,
  PMIcon,
  PMSpinner,
  PMText,
  PMVStack,
  type PMTextColors,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuBookOpen,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type { PackageId } from '@packmind/types';

import { COMPONENT_TYPE_LABELS_SINGULAR } from '../../context/buildPackageContext';
import { useAuthContext } from '../../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../../spaces/hooks/useCurrentSpace';
import { useGetPackageReleaseQuery } from '../../../api/queries/DeploymentsQueries';
import {
  changeCount,
  releaseDestinationChanges,
  type ComponentChange,
  type DestinationChanges,
} from '../selectors/destinationChanges';
import type { ArtifactKind } from '../types';

const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookOpen,
  command: LuTerminal,
  skill: LuWandSparkles,
};

/**
 * The three bands, in the order a reader meets a change.
 *
 * What arrives, what moves, and last what goes: the destructive group sits at
 * the bottom rather than in the middle, so the one action that cannot be undone
 * by distributing again is the one the eye lands on last.
 */
const GROUPS: {
  key: keyof DestinationChanges;
  label: string;
  color: PMTextColors;
}[] = [
  { key: 'added', label: 'Added', color: 'success' },
  { key: 'updated', label: 'Updated', color: 'secondary' },
  { key: 'removed', label: 'Removed', color: 'warning' },
];

/** `v3`, or nothing at all when the destination has no version to name. */
function versionLabel(version: number | null): string {
  return version === null ? '' : `v${version}`;
}

function ChangeRow({ change }: Readonly<{ change: ComponentChange }>) {
  const Icon = KIND_ICON[change.kind];
  const moves = change.fromVersion !== null && change.toVersion !== null;
  return (
    <PMHStack gap={3} align="center" paddingY={1} paddingX={2}>
      <PMIcon fontSize="sm" color="text.faded">
        <Icon />
      </PMIcon>
      <PMText
        fontSize="xs"
        color="secondary"
        fontFamily={change.kind === 'command' ? 'mono' : undefined}
        flex={1}
        minW={0}
        truncate
      >
        {change.name}
      </PMText>
      {/*
        The family in words, beside the icon rather than instead of it. Three
        glyphs a reader has to have learnt is three glyphs they can read wrong,
        and the one thing this list must never be ambiguous about is what a
        named row actually is. Same pair the component rail shows.
      */}
      <PMText fontSize="2xs" color="faded" whiteSpace="nowrap">
        {COMPONENT_TYPE_LABELS_SINGULAR[change.kind]}
      </PMText>
      {moves ? (
        <>
          <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
            {versionLabel(change.fromVersion)}
          </PMText>
          <PMIcon fontSize="xs" color="text.faded">
            <LuArrowRight />
          </PMIcon>
          <PMText
            fontSize="xs"
            color="primary"
            fontWeight="medium"
            fontVariantNumeric="tabular-nums"
          >
            {versionLabel(change.toVersion)}
          </PMText>
        </>
      ) : (
        <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
          {versionLabel(change.toVersion ?? change.fromVersion)}
        </PMText>
      )}
    </PMHStack>
  );
}

/**
 * What a distribution would change at one destination, by what it does.
 *
 * Grouped by action rather than by family, which is the whole point: a reader
 * about to press Distribute is asking what this commit does to the repository,
 * and "two standards, one command, one skill" does not answer it while
 * "one added, two updated, one removed" does. The family survives as the icon
 * on each row, where it costs no heading.
 */
export function DestinationChangeList({
  changes,
}: Readonly<{ changes: DestinationChanges }>) {
  if (changeCount(changes) === 0) {
    return (
      <PMText fontSize="xs" color="faded">
        This destination already holds every component of the package.
      </PMText>
    );
  }

  return (
    <PMVStack gap={3} align="stretch">
      {GROUPS.map(({ key, label, color }) => {
        const group = changes[key];
        if (group.length === 0) return null;
        return (
          <PMVStack key={key} gap={0} align="stretch">
            <PMText
              fontSize="11px"
              fontWeight="semibold"
              color={color}
              paddingX={2}
              paddingBottom={1}
            >
              {label} · {group.length}
            </PMText>
            {group.map((change) => (
              <ChangeRow key={`${key}:${change.key}`} change={change} />
            ))}
          </PMVStack>
        );
      })}
    </PMVStack>
  );
}

/**
 * The same list for a destination pinned to a release, read from the two cuts.
 *
 * Its own component, and rendered only once the row is open, so the two reads
 * happen for the destination a reader asked about rather than for every row of
 * a batch. A pinned destination holds exactly what its release pinned, so
 * nothing on the drift payload can answer this: the answer is the difference
 * between two immutable cuts, and that is what this fetches.
 */
export function PinnedDestinationChanges({
  packageId,
  fromVersion,
  toVersion,
}: Readonly<{
  packageId: PackageId;
  fromVersion: string;
  toVersion: string;
}>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const from = useGetPackageReleaseQuery(
    organization?.id,
    spaceId,
    packageId,
    fromVersion,
  );
  const to = useGetPackageReleaseQuery(
    organization?.id,
    spaceId,
    packageId,
    toVersion,
  );

  if (from.isLoading || to.isLoading) {
    return (
      <PMHStack gap={2} align="center" paddingX={2}>
        <PMSpinner size="sm" />
        <PMText fontSize="xs" color="secondary">
          Comparing {fromVersion} with {toVersion}…
        </PMText>
      </PMHStack>
    );
  }

  if (!from.data || !to.data) {
    return (
      <PMBox paddingX={2}>
        <PMText fontSize="xs" color="secondary">
          {fromVersion} and {toVersion} could not be compared. The distribution
          still moves this destination to {toVersion}.
        </PMText>
      </PMBox>
    );
  }

  return (
    <DestinationChangeList
      changes={releaseDestinationChanges(from.data.release, to.data.release)}
    />
  );
}
