import { useState, type ReactNode } from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
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
  LuRefreshCw,
  LuStore,
} from 'react-icons/lu';
import { DriftArtifactRow } from '../redesign/components/DriftArtifactRow';
import { SelectionBar } from '../SelectionBar';
import { ContextChip } from './ContextChip';
import { ContextPickBox } from './ContextPickBox';
import { ContextSearchField } from './ContextSearchField';
import {
  STATE_TONE,
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
  headerAction,
  onUpdate,
}: Readonly<{
  destinations: readonly PackageDestination[];
  /**
   * Whatever the caller wants on the search line, at its right end. The search
   * field stops at 420px and the rest of that line was empty, so a caller with
   * one control to place had to spend a row of its own on it.
   */
  headerAction?: ReactNode;
  /**
   * Pushing this package to a set of landings again: one, from a row, or those
   * the reader ticked. One callback for both, because they are one gesture over
   * a different number of rows, and two would let a bar and a row disagree
   * about what "update" sends.
   *
   * Absent for a reader who cannot act, which is what takes the checkboxes and
   * the buttons off the list at once.
   */
  onUpdate?: (destinations: readonly PackageDestination[]) => void;
}>) {
  const [filter, setFilter] = useState<PackageDestinationFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const isSearching = query.trim().length > 0;
  const matched = searchPackageDestinations(destinations, query);
  const shown = filterPackageDestinations(matched, filter);
  const failed = shown.filter((row) => row.state === 'failed');
  const pending = shown.filter(
    (row) => row.state === 'behind' || row.state === 'waiting',
  );
  const aligned = shown.filter((row) => !needsAHand(row.state));

  /*
   * Resolved against what is on screen, not against everything ever ticked. A
   * reader who picks three rows and then types a name into the field must not
   * send a fourth they can no longer see, and this is the rule the component
   * list of this surface already follows for the same reason.
   */
  const pickable = shown.filter(canPush);
  const picked = pickable.filter((row) => selectedKeys.has(row.key));
  const isSelecting = picked.length > 0;

  const toggle = (row: PackageDestination) =>
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (!next.delete(row.key)) next.add(row.key);
      return next;
    });

  return (
    <>
      {/*
        Above the chips rather than beside them, because it is the wider
        question: the chips cut the list by what it is, and this one reaches a
        row the reader already has in mind. At three hundred landings it is the
        control most readers come for.
      */}
      <PMHStack
        paddingBottom={2}
        align="center"
        justify="space-between"
        gap={3}
      >
        <PMBox maxWidth="420px" flex="1" minW={0}>
          <ContextSearchField
            label="Find a repository, branch or marketplace"
            value={query}
            onChange={setQuery}
          />
        </PMBox>
        {headerAction}
      </PMHStack>
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
      {onUpdate && isSelecting && (
        <PMBox paddingBottom={2}>
          <SelectionBar
            count={picked.length}
            total={pickable.length}
            onSelectAll={() =>
              setSelectedKeys(new Set(pickable.map((row) => row.key)))
            }
            actions={[
              {
                label: `Update ${picked.length} destination${
                  picked.length === 1 ? '' : 's'
                }`,
                icon: <LuRefreshCw />,
                onAct: () => onUpdate(picked),
              },
            ]}
            onClear={() => setSelectedKeys(new Set())}
          />
        </PMBox>
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
          selection={
            onUpdate ? { selectedKeys, isSelecting, toggle } : undefined
          }
          isFirst
        />
        <Band
          label="Behind or waiting"
          tone="orange.500"
          rows={pending}
          total={isSearching ? undefined : destinations.length}
          onUpdate={onUpdate}
          selection={
            onUpdate ? { selectedKeys, isSelecting, toggle } : undefined
          }
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

/**
 * Whether this row can be sent again.
 *
 * One rule for the checkbox and for the button, because the two offer the same
 * gesture and a row that can be ticked but not pushed would put work into a
 * batch that then silently drops it.
 *
 * Something outstanding is what it takes, not a particular state: a landing
 * whose push was rejected is repaired by pushing again, and so is a publish
 * that failed, and both of those are `failed` rows. What it excludes is work
 * already on its way, which would be started twice, and a row with nothing to
 * send, where the gesture would write nothing anywhere.
 */
function canPush(destination: PackageDestination): boolean {
  return destination.hasWorkToSend && destination.state !== 'waiting';
}

/**
 * What a row needs to be picked: which keys are ticked, whether a batch is
 * under way, and the way to tick one.
 */
type RowSelection = {
  selectedKeys: ReadonlySet<string>;
  isSelecting: boolean;
  toggle: (destination: PackageDestination) => void;
};

function Band({
  label,
  tone,
  rows,
  total,
  isFirst,
  onUpdate,
  selection,
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
  onUpdate?: (destinations: readonly PackageDestination[]) => void;
  selection?: RowSelection;
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
        <DestinationRow
          key={row.key}
          destination={row}
          onUpdate={onUpdate}
          selection={selection}
        />
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
  selection,
}: Readonly<{
  destination: PackageDestination;
  onUpdate?: (destinations: readonly PackageDestination[]) => void;
  selection?: RowSelection;
}>) {
  const [expanded, setExpanded] = useState(false);
  /*
   * Only a row that knows what is late under it. The state line names two
   * components and says how many more; opening it is how the reader gets the
   * rest, so a row whose line is the whole story has nothing to open. That
   * includes a drifted marketplace, whose copy is known to be behind and not
   * by what.
   */
  const canExpand = destination.behindArtifacts.length > 0;
  const isPicked = selection?.selectedKeys.has(destination.key) ?? false;

  return (
    <PMBox
      borderTopWidth="1px"
      borderColor="border.tertiary"
      transition="background-color 150ms ease-out"
      // The picked row stays legible once the pointer has left it.
      bg={isPicked ? 'background.secondary' : undefined}
      _hover={{ bg: 'background.secondary' }}
      // Chakra's `_groupHover` keys off this class, not `role="group"`.
      className="group"
    >
      <PMHStack gap={3} align="center" paddingX={3} paddingY={2}>
        {selection && (
          /*
            The column is there whether or not this row can be picked, so the
            names of a band keep one left edge. A landing with nothing to send
            is not a landing that should be indented differently.
          */
          <PMBox
            /*
              28px and pulled back over the row's left padding: the gutter is
              part of the target, and the box still lands where it was drawn.
            */
            width="28px"
            marginLeft="-12px"
            alignSelf="stretch"
            flexShrink={0}
            display="flex"
          >
            {canPush(destination) && (
              <ContextPickBox shown={isPicked || selection.isSelecting}>
                <PMCheckbox
                  size="sm"
                  checked={isPicked}
                  onCheckedChange={() => selection.toggle(destination)}
                  inputProps={{
                    'aria-label': `Select ${destination.name}`,
                  }}
                />
              </ContextPickBox>
            )}
          </PMBox>
        )}
        {/*
          The identity and the state are one target, so the whole left of the
          row opens it rather than a chevron the reader has to hit. A row that
          cannot open is a plain box: a button that does nothing still says it
          is one, through its pointer and its focus ring.
        */}
        <PMBox
          flex={1}
          minW={0}
          {...(canExpand
            ? {
                as: 'button' as const,
                onClick: () => setExpanded((previous) => !previous),
                textAlign: 'left' as const,
                cursor: 'pointer',
                'aria-expanded': expanded,
                'aria-label': `${expanded ? 'Hide' : 'Show'} what is behind on ${destination.name}`,
                _focusVisible: {
                  outline: '2px solid',
                  outlineColor: 'branding.primary',
                  outlineOffset: '2px',
                  borderRadius: 'sm',
                },
              }
            : {})}
        >
          {/*
            The three marks a row carries, in one run at its vertical middle.
            They were at three heights and three columns: the kind centred on
            the two lines, the chevron hung off the first line's baseline, and
            the state dot inside the second. None of the three belongs to a
            line — what a destination is, how it stands and whether it opens
            are all facts about the whole row — so they read as one cluster
            and the text beside them keeps a single left edge.
          */}
          <PMHStack gap={2} align="center" minW={0}>
            <StateDot state={destination.state} />
            <GutterIcon>
              {destination.kind === 'repository' ? (
                <LuFolderGit2 />
              ) : (
                <LuStore />
              )}
            </GutterIcon>
            {/*
              Held whether or not this row opens, for the reason the selection
              column is: a landing whose line is the whole story is not a
              landing that should be indented differently from its neighbours.
            */}
            <GutterIcon>
              {canExpand && (expanded ? <LuChevronDown /> : <LuChevronRight />)}
            </GutterIcon>
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
              <PMText fontSize="xs" color="faded" truncate>
                {stateSentence(destination)}
              </PMText>
            </PMBox>
          </PMHStack>
        </PMBox>
        <RowAction destination={destination} onUpdate={onUpdate} />
      </PMHStack>

      {expanded && (
        <PMBox
          paddingLeft={`${textIndentPx(selection !== undefined)}px`}
          paddingRight={3}
          paddingBottom={3}
        >
          {/*
            The same row the drift pane and a repository's detail already print
            for this, rather than a third spelling of "v2 became v5". What it
            adds over the line above is the whole list, the kind of each
            component, and the two states a version cannot express: a component
            waiting to be written for the first time, and one waiting to be
            taken away.
          */}
          {destination.behindArtifacts.map((entry) => (
            <DriftArtifactRow
              key={`${entry.artifact.id}-${entry.reason}`}
              entry={entry}
            />
          ))}
        </PMBox>
      )}
    </PMBox>
  );
}

/*
 * The fixed columns down the left of every row, in pixels.
 *
 * Numbers rather than spacing tokens because the indent the expansion needs is
 * their sum, and a sum of tokens is not a token. They mirror `gap={2}` on the
 * run and `gap={3}` / `paddingX={3}` on the row, so a change to either has to
 * come here too; the alternative was the literal `44px` this replaces, which
 * lined up with nothing and moved with nothing.
 */
const STATE_DOT_PX = 6;
const GUTTER_ICON_PX = 16;
const GUTTER_GAP_PX = 8;
const SELECTION_COLUMN_PX = 16;
const ROW_GAP_PX = 12;
const ROW_PADDING_PX = 12;

/**
 * Where a row's text begins, which is where everything it unfolds lines up.
 *
 * The drift rows under an opened landing used to start at a fixed indent that
 * matched neither the name above them nor each other across the two widths
 * this list has: a selection column is either there or it is not, and it moves
 * every row by its own width plus the gap after it.
 */
function textIndentPx(hasSelection: boolean): number {
  const gutters = STATE_DOT_PX + GUTTER_ICON_PX * 2 + GUTTER_GAP_PX * 3;
  return (
    ROW_PADDING_PX +
    (hasSelection ? SELECTION_COLUMN_PX + ROW_GAP_PX : 0) +
    gutters
  );
}

/**
 * How this destination stands, as a mark rather than a word.
 *
 * At the row's left edge and no longer in front of its sentence, which is
 * where it could not be compared: three hundred rows made three hundred dots
 * at as many abscissas, one per sentence. In a column it is a stripe of colour
 * the eye runs down, which is the reading a long list is entered for.
 *
 * Kept even though the bands already sort by state, because `Behind or
 * waiting` holds two of them and this is what tells them apart. The day that
 * band splits, the column can go.
 */
function StateDot({ state }: Readonly<{ state: PackageDestinationState }>) {
  return (
    <PMBox
      width={`${STATE_DOT_PX}px`}
      height={`${STATE_DOT_PX}px`}
      borderRadius="full"
      bg={STATE_TONE[state]}
      flexShrink={0}
      aria-hidden
    />
  );
}

/**
 * One of the row's fixed columns, filled or not.
 *
 * A box of its own rather than a bare `PMIcon`, so the column keeps its width
 * when there is nothing to put in it and the text beside it does not move.
 * Centred both ways, which is what stops an icon hanging off the text baseline
 * it has no business sharing.
 */
function GutterIcon({ children }: Readonly<{ children?: ReactNode }>) {
  return (
    <PMBox
      width={`${GUTTER_ICON_PX}px`}
      flexShrink={0}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      fontSize="sm"
      color="text.faded"
    >
      {children}
    </PMBox>
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
    const what =
      destination.kind === 'repository'
        ? 'The last distribution failed'
        : 'The last publish failed';
    /*
     * A failure and a drift hold at once, and the failure alone was the whole
     * sentence until a row on screen showed what that costs: a landing whose
     * push was rejected reported nothing about the four components still
     * waiting on it, while the row below it, drifted in exactly the same way,
     * named them. The state says what happened; this says what it left.
     */
    return destination.behindCount > 0
      ? `${what}, ${destination.behindCount} component${
          destination.behindCount === 1 ? '' : 's'
        } still behind`
      : what;
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
  onUpdate?: (destinations: readonly PackageDestination[]) => void;
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

  if (!onUpdate || !canPush(destination)) return null;

  return (
    <PMButton
      variant="tertiary"
      size="xs"
      flexShrink={0}
      onClick={() => onUpdate([destination])}
    >
      {/*
        The verb of the channel, because the two are not the same act: a
        repository is written to and the work is done when the call returns, a
        catalog is republished through a pull request someone then merges. The
        bar above says `Update` over a mixed pick, which is the one word that
        covers both without promising either.
      */}
      {destination.kind === 'marketplace' ? 'Republish' : 'Update'}
    </PMButton>
  );
}
