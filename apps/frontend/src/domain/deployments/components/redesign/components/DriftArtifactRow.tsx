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

/**
 * The same noun with its first letter raised, for the row that prints it as a
 * label rather than dropping it into a sentence.
 *
 * In the text and not in CSS, so the word a reader sees is the word this row
 * can be asserted to say, and one map keeps both callers on one vocabulary.
 */
function kindLabel(kind: ArtifactKind): string {
  const noun = KIND_NOUN[kind];
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

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
      {/*
        The name, and then what kind of thing carries it.

        The icon said the kind on its own, and the reader who asked for this
        had a package and a standard both named Typescript on screen at once:
        three marks to learn before the rows mean anything, against one word
        that means it on sight. Written rather than kept behind a hover, since
        a hover has to be found before it can be read, one row at a time, and
        a touch screen has no hover at all.

        The two travel together on the left because that is where this pane
        keeps identity: the eye runs down the left edge for what a row is and
        down the right edge for where it stands. Put at the far end instead,
        the word landed against `v1 -> v2` and read as part of the version.

        The name is the half that truncates. A component with a long name is
        exactly the one whose kind is worth keeping.
      */}
      <PMHStack gap={2} align="center" flex={1} minW={0}>
        <PMText
          fontSize="sm"
          color="secondary"
          fontFamily={entry.artifact.kind === 'command' ? 'mono' : undefined}
          minW={0}
          truncate
        >
          {entry.artifact.name}
        </PMText>
        <PMText fontSize="xs" color="faded" flexShrink={0}>
          {kindLabel(entry.artifact.kind)}
        </PMText>
      </PMHStack>
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
