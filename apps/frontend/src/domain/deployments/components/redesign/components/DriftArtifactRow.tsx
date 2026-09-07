import { PMBadge, PMHStack, PMIcon, PMText, PMTooltip } from '@packmind/ui';
import {
  LuArrowRight,
  LuBookOpen,
  LuTerminal,
  LuTrash2,
  LuWandSparkles,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type { DriftArtifactEntry } from '../selectors/installDriftEntries';
import type { ArtifactKind } from '../types';

/**
 * One component of a package, on one install, said to be out of step with what
 * Packmind holds.
 *
 * Its own file because two panes printed it: a repository's detail, which lists
 * the packages that reach it, and a package's own Distribution tab, which lists
 * the installs it reaches. The two copies were identical to the byte, and the
 * feedback that named this row asked for one thing to change in it, which is
 * one edit or two depending on whether this file exists.
 *
 * The sync confirmation lists the same entries and deliberately keeps its own
 * row: it is a list to read before committing, not a state to inspect, and it
 * is set smaller and without the borders and badges these two carry.
 */
const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookOpen,
  command: LuTerminal,
  skill: LuWandSparkles,
};

const KIND_NOUN: Record<ArtifactKind, string> = {
  standard: 'standard',
  command: 'command',
  skill: 'skill',
};

export function DriftArtifactRow({
  entry,
}: Readonly<{ entry: DriftArtifactEntry }>) {
  const Icon = KIND_ICON[entry.artifact.kind];
  return (
    <PMHStack
      gap={3}
      align="center"
      paddingY={1.5}
      paddingX={2}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _last={{ borderBottom: 'none' }}
    >
      <PMIcon fontSize="sm" color="text.faded">
        <Icon />
      </PMIcon>
      <PMText
        fontSize="sm"
        color="secondary"
        fontFamily={entry.artifact.kind === 'command' ? 'mono' : undefined}
        flex={1}
        minW={0}
        truncate
      >
        {entry.artifact.name}
      </PMText>
      <DriftReasonIndicator entry={entry} />
    </PMHStack>
  );
}

function DriftReasonIndicator({
  entry,
}: Readonly<{ entry: DriftArtifactEntry }>) {
  if (entry.reason === 'needs-removal') {
    return (
      <PMTooltip
        label={`The ${KIND_NOUN[entry.artifact.kind]} deletion will be effective on the repository after the next distribution.`}
        placement="top"
      >
        <PMHStack gap={1.5} align="center" cursor="help">
          <PMIcon fontSize="xs" color="red.500">
            <LuTrash2 />
          </PMIcon>
          <PMBadge colorPalette="red" size="sm">
            Needs removal
          </PMBadge>
        </PMHStack>
      </PMTooltip>
    );
  }
  if (entry.reason === 'not-distributed') {
    return (
      <PMTooltip
        label="Added to the package — included in the next distribution."
        placement="top"
      >
        <PMBadge colorPalette="red" size="sm">
          Not distributed
        </PMBadge>
      </PMTooltip>
    );
  }
  return (
    <PMHStack gap={2} align="center">
      <PMText fontSize="xs" color="warning" fontVariantNumeric="tabular-nums">
        v{entry.deployedVersion}
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
        v{entry.artifact.packmindVersion}
      </PMText>
    </PMHStack>
  );
}
