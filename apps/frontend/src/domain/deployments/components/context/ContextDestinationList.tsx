import { useState, type ReactNode } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMIconButton,
  PMLink,
  PMText,
} from '@packmind/ui';
import {
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuFolderGit2,
  LuStore,
} from 'react-icons/lu';
import { ContextChip } from './ContextChip';
import { ContextSearchField } from './ContextSearchField';
import {
  filterPackageDestinations,
  needsAHand,
  packageDestinationSummary,
  searchPackageDestinations,
  type PackageDestination,
  type PackageDestinationFilter,
  type PackageDestinationState,
} from './buildPackageDestinations';

/**
 * Everywhere a package stands, in one list.
 *
 * The exceptions are the page. A package reaching three hundred landings has
 * three hundred rows worth of nothing to say and four worth reading, so the
 * ones that are fine are a count and a fold, and what is left above them is
 * what someone opened this tab to find.
 *
 * Failures are a band of their own rather than the top of the drifted one. Both
 * need a hand, but not the same hand: a drifted landing is put right by pushing
 * again, and a failed one may not be, since what stopped the push is often
 * outside Packmind. Reading them in one run teaches the eye that the first rows
 * are the worst of the same thing, which is not what they are.
 */
export function ContextDestinationList({
  destinations,
  onUpdate,
}: Readonly<{
  destinations: readonly PackageDestination[];
  /**
   * Pushing this package to one landing again. Absent for a marketplace, which
   * is republished rather than written to, and for a reader who cannot act.
   */
  onUpdate?: (destination: PackageDestination) => void;
}>) {
  const [filter, setFilter] = useState<PackageDestinationFilter>('all');
  const [query, setQuery] = useState('');

  const isSearching = query.trim().length > 0;
  const matched = searchPackageDestinations(destinations, query);
  const shown = filterPackageDestinations(matched, filter);
  const failed = shown.filter((row) => row.state === 'failed');
  const pending = shown.filter(
    (row) => row.state === 'behind' || row.state === 'waiting',
  );
  const aligned = shown.filter((row) => !needsAHand(row.state));

  return (
    <>
      {/*
        Above the chips rather than beside them, because it is the wider
        question: the chips cut the list by what it is, and this one reaches a
        row the reader already has in mind. At three hundred landings it is the
        control most readers come for.
      */}
      <PMBox paddingBottom={2} maxWidth="420px">
        <ContextSearchField
          label="Find a repository, branch or marketplace"
          value={query}
          onChange={setQuery}
        />
      </PMBox>
      <FilterRow
        destinations={destinations}
        value={filter}
        onChange={setFilter}
      />
      {isSearching && (
        <PMHStack gap={2} align="center" paddingBottom={2}>
          <PMText fontSize="xs" color="faded">
            {matched.length} of {destinations.length} destination
            {destinations.length === 1 ? '' : 's'} match "{query.trim()}".
          </PMText>
          <PMButton variant="tertiary" size="xs" onClick={() => setQuery('')}>
            Clear
          </PMButton>
        </PMHStack>
      )}
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        overflow="hidden"
      >
        {/*
          An empty box would read as a rendering fault, which is how the
          question "is this repository in here" gets answered by silence.
        */}
        {shown.length === 0 && (
          <PMText fontSize="sm" color="faded" padding={4} as="div">
            {isSearching
              ? `No destination of this package matches "${query.trim()}".`
              : 'No destination under this reading.'}
          </PMText>
        )}
        <Band
          label="Failed"
          tone="red.300"
          rows={failed}
          /*
           * The share of the package, and only while the list is the package.
           * Under a search "1 of 240" would put the size of the whole beside a
           * number that counts what one typed word reached, and the line above
           * already states that ratio in the terms it belongs to.
           */
          total={isSearching ? undefined : destinations.length}
          onUpdate={onUpdate}
          isFirst
        />
        <Band
          label="Behind or waiting"
          tone="orange.500"
          rows={pending}
          total={isSearching ? undefined : destinations.length}
          onUpdate={onUpdate}
          isFirst={failed.length === 0}
        />
        <UpToDateBand
          rows={aligned}
          isFirst={failed.length === 0 && pending.length === 0}
          /*
           * Asked for by name, so they are the list rather than the line under
           * it. Folding them there would answer a click on `Up to date 3` with
           * a count of three and no way to see them without undoing the filter.
           */
          forceOpen={filter === 'up-to-date' || isSearching}
        />
      </PMBox>
    </>
  );
}

/**
 * The five readings of the list, as one row.
 *
 * Counted from the whole set and not from what is on screen: a chip whose
 * number changed with the filter would be reporting on the filter rather than
 * on the package, and the reader could not use it to get back.
 *
 * A reading that would leave the list as it is gets no chip. That covers the
 * empty one, `Marketplaces 0` on a package that reaches none, and the full one,
 * `Repositories 11` beside `All destinations 11`, which is the same list under
 * a second name. Both are controls that do nothing, on a row whose whole job is
 * to say what there is; the second is the more misleading of the two, since its
 * number invites the reader to believe it narrows something.
 *
 * When that leaves `All destinations` alone, the row goes: one chip, always
 * active, choosing between itself and nothing is a heading drawn as a control.
 */
function FilterRow({
  destinations,
  value,
  onChange,
}: Readonly<{
  destinations: readonly PackageDestination[];
  value: PackageDestinationFilter;
  onChange: (next: PackageDestinationFilter) => void;
}>) {
  const summary = packageDestinationSummary(destinations);

  const chips: Array<{
    filter: PackageDestinationFilter;
    label: string;
    count: number;
    icon?: ReactNode;
  }> = [
    { filter: 'all', label: 'All destinations', count: summary.all },
    {
      filter: 'repositories',
      label: 'Repositories',
      count: summary.repositories,
      icon: <LuFolderGit2 />,
    },
    {
      filter: 'marketplaces',
      label: 'Marketplaces',
      count: summary.marketplaces,
      icon: <LuStore />,
    },
    {
      filter: 'needs-a-hand',
      label: 'Needs a hand',
      count: summary.needsAHand,
    },
    { filter: 'up-to-date', label: 'Up to date', count: summary.upToDate },
  ];

  const narrowing = chips.filter(
    (chip) =>
      chip.filter !== 'all' &&
      /*
       * The active one stays whatever its count, so a filter can always be
       * read off the row and undone from it.
       */
      (chip.filter === value || (chip.count > 0 && chip.count < summary.all)),
  );

  if (narrowing.length === 0) return null;

  return (
    <PMHStack gap={1} align="center" paddingBottom={2} wrap="wrap">
      {[chips[0], ...narrowing].map((chip) => (
        <ContextChip
          key={chip.filter}
          label={chip.label}
          count={chip.count}
          icon={chip.icon}
          isActive={value === chip.filter}
          onClick={() => onChange(chip.filter)}
        />
      ))}
    </PMHStack>
  );
}

function Band({
  label,
  tone,
  rows,
  total,
  isFirst,
  onUpdate,
}: Readonly<{
  label: string;
  tone: string;
  rows: readonly PackageDestination[];
  /**
   * Every destination, so the band can say what share of them it holds.
   * Absent when the list is a search result, which is a share of nothing.
   */
  total?: number;
  isFirst: boolean;
  onUpdate?: (destination: PackageDestination) => void;
}>) {
  if (rows.length === 0) return null;

  return (
    <>
      <PMHStack
        gap={2}
        align="center"
        paddingX={3}
        paddingY="5px"
        bg="background.secondary"
        borderTopWidth={isFirst ? '0' : '1px'}
        borderColor="border.tertiary"
      >
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg={tone}
          flexShrink={0}
          aria-hidden
        />
        <PMText fontSize="xs" fontWeight="semibold">
          {label}
        </PMText>
        {/*
          The share and not the count on its own. "2" says how much is wrong,
          "2 of 240" says whether that is a bad day or a broken setup, and the
          second number is the one a reader has no other way to get once the
          rest of the list is folded away.
        */}
        <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
          {total === undefined
            ? `${rows.length} destination${rows.length === 1 ? '' : 's'}`
            : `${rows.length} of ${total} destination${total === 1 ? '' : 's'}`}
        </PMText>
      </PMHStack>
      {rows.map((row) => (
        <DestinationRow key={row.key} destination={row} onUpdate={onUpdate} />
      ))}
    </>
  );
}

/**
 * What is fine, as one line.
 *
 * Folded, and it opens. The count is the answer nine times out of ten, and the
 * tenth is someone checking that a particular repository is in there, which is
 * a fair question to ask without leaving the tab.
 */
function UpToDateBand({
  rows,
  isFirst,
  forceOpen = false,
}: Readonly<{
  rows: readonly PackageDestination[];
  isFirst: boolean;
  /**
   * These rows are what was asked for, so they are shown and the fold is not
   * offered. Kept out of the state below rather than pushed into it: a filter
   * that set the state would leave it set once the filter was dropped, and the
   * next reader would find three hundred rows open for a reason they never saw.
   */
  forceOpen?: boolean;
}>) {
  const [openedByReader, setOpened] = useState(false);
  const open = forceOpen || openedByReader;

  if (rows.length === 0) return null;

  return (
    <>
      <PMHStack
        gap={2}
        align="center"
        paddingLeft={3}
        paddingRight={2}
        paddingY="5px"
        bg="background.secondary"
        borderTopWidth={isFirst ? '0' : '1px'}
        borderColor="border.tertiary"
      >
        <PMIcon fontSize="xs" color="text.faded">
          <LuCheck />
        </PMIcon>
        <PMText fontSize="xs" color="faded">
          {rows.length} destination{rows.length === 1 ? ' is' : 's are'} up to
          date
        </PMText>
        {/*
          The names beside the count while they fit, which is what makes the
          folded line worth reading at all in the small case: three
          repositories named take no more room than the sentence saying there
          are three.
        */}
        {!open && (
          <PMText fontSize="xs" color="faded" truncate minW={0}>
            {rows.map((row) => row.name).join(' · ')}
          </PMText>
        )}
        {!forceOpen && (
          <PMIconButton
            aria-label={`${open ? 'Hide' : 'Show'} the destinations that are up to date`}
            aria-expanded={open}
            variant="ghost"
            size="2xs"
            color="text.faded"
            marginLeft="auto"
            flexShrink={0}
            onClick={() => setOpened((previous) => !previous)}
          >
            {open ? <LuChevronDown /> : <LuChevronRight />}
          </PMIconButton>
        )}
      </PMHStack>
      {open &&
        rows.map((row) => <DestinationRow key={row.key} destination={row} />)}
    </>
  );
}

function DestinationRow({
  destination,
  onUpdate,
}: Readonly<{
  destination: PackageDestination;
  onUpdate?: (destination: PackageDestination) => void;
}>) {
  return (
    <PMHStack
      gap={3}
      align="center"
      paddingX={3}
      paddingY={2}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      _hover={{ bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
    >
      <PMIcon fontSize="sm" color="text.faded" flexShrink={0}>
        {destination.kind === 'repository' ? <LuFolderGit2 /> : <LuStore />}
      </PMIcon>
      <PMBox flex={1} minW={0}>
        <PMHStack gap={2} align="baseline" minW={0}>
          <PMText fontSize="sm" fontWeight="medium" truncate>
            {destination.name}
          </PMText>
          {destination.details.length > 0 && (
            <PMText fontSize="xs" color="faded" truncate flexShrink={0}>
              {destination.details.join(' · ')}
            </PMText>
          )}
        </PMHStack>
        <StateLine destination={destination} />
      </PMBox>
      <RowAction destination={destination} onUpdate={onUpdate} />
    </PMHStack>
  );
}

/** The colour of each state, in one place, so a dot and a band agree. */
const STATE_TONE: Record<PackageDestinationState, string> = {
  failed: 'red.300',
  waiting: 'blue.300',
  behind: 'orange.500',
  aligned: 'green.500',
};

function StateLine({
  destination,
}: Readonly<{ destination: PackageDestination }>) {
  return (
    <PMHStack gap={2} align="center" minW={0}>
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg={STATE_TONE[destination.state]}
        flexShrink={0}
        aria-hidden
      />
      <PMText fontSize="xs" color="faded" truncate>
        {stateSentence(destination)}
      </PMText>
    </PMHStack>
  );
}

/**
 * What a row says about itself.
 *
 * The behind case names the components rather than counting them. The count
 * alone was what the pane showed before, and it sent every reader who cared
 * into an expansion to learn what "4 components behind" was made of; two names
 * and a remainder answer that on the row, and the remainder is honest about
 * being one.
 */
function stateSentence(destination: PackageDestination): string {
  if (destination.state === 'failed') {
    return destination.kind === 'repository'
      ? 'The last distribution failed'
      : 'The last publish failed';
  }

  if (destination.state === 'waiting') {
    return destination.kind === 'repository'
      ? 'Distributing now'
      : 'Published to the sync pull request, live once it is merged';
  }

  if (destination.state === 'behind') {
    if (destination.behindCount === 0) {
      /*
       * A marketplace, where the drift says the copy was overtaken and not by
       * what. Saying "0 components behind" would be a number where there is
       * none.
       */
      return 'The published copy is behind this package';
    }
    return `${destination.behindCount} component${
      destination.behindCount === 1 ? '' : 's'
    } behind: ${behindNames(destination)}`;
  }

  return destination.kind === 'repository' ? 'Up to date' : 'Published';
}

/** Two names and the size of what is left, which is how a row stays a row. */
function behindNames(destination: PackageDestination): string {
  const shown = destination.behindArtifacts
    .slice(0, 2)
    .map(
      (entry) => `${entry.artifact.name} v${entry.artifact.packmindVersion}`,
    );
  const hidden = destination.behindArtifacts.length - shown.length;
  return hidden > 0 ? `${shown.join(', ')}, +${hidden}` : shown.join(', ');
}

function RowAction({
  destination,
  onUpdate,
}: Readonly<{
  destination: PackageDestination;
  onUpdate?: (destination: PackageDestination) => void;
}>): ReactNode {
  /*
   * The pull request first, whatever else the row could offer. A publication
   * waiting on a merge has had its work done, and the one useful thing left is
   * the page where someone can finish it.
   */
  if (destination.state === 'waiting' && destination.prUrl) {
    return (
      <PMLink
        href={destination.prUrl}
        target="_blank"
        rel="noopener noreferrer"
        fontSize="xs"
        flexShrink={0}
      >
        Review the pull request
      </PMLink>
    );
  }

  if (
    !onUpdate ||
    destination.installKey === null ||
    destination.state !== 'behind'
  ) {
    return null;
  }

  return (
    <PMButton
      variant="tertiary"
      size="xs"
      flexShrink={0}
      onClick={() => onUpdate(destination)}
    >
      Update
    </PMButton>
  );
}
