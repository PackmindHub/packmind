import { Fragment, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMCheckbox,
  PMHStack,
  PMIcon,
  PMIconButton,
  PMMenu,
  PMPortal,
  PMText,
  PMTooltip,
} from '@packmind/ui';
import {
  LuBookCheck,
  LuChevronRight,
  LuEllipsisVertical,
  LuFolderInput,
  LuPackage,
  LuPackageMinus,
  LuPlus,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import {
  componentSelectionKey,
  type ContextComponent,
  type ContextComponentType,
} from './buildPackageContext';
import {
  pendingReviewsByComponent,
  reviewChangesLabel,
} from './componentMaintenance';

/**
 * The mark of each type, in one place. The two panes and the filter chips read
 * it, so a type cannot end up wearing two icons depending on where it is shown.
 */
export const COMPONENT_TYPE_ICONS: Record<ContextComponentType, ReactNode> = {
  standard: <LuBookCheck />,
  command: <LuTerminal />,
  skill: <LuWandSparkles />,
};

/**
 * The mark of each gesture a selection of components can be put through, in one
 * place, for the reason the type icons are: a row's menu offers these from here
 * and the selection bar offers the same ones from the panes, so two files would
 * be choosing a glyph for one action.
 *
 * `add` has no row of its own to sit on, since a component is added to a package
 * rather than acted on inside one. It is here because it is the third thing a
 * selection can be put through, and a bar with one bare button among iconed ones
 * reads as a rendering gap.
 */
export const COMPONENT_ACTION_ICONS = {
  move: <LuFolderInput />,
  remove: <LuPackageMinus />,
  add: <LuPlus />,
} as const;

/**
 * One row of the list, and optionally the packages the component belongs to.
 * The pair travels together rather than the component alone because the same
 * list is read scoped to one package and unscoped across the space, and in the
 * second case the owner is the column that makes the row mean something.
 */
export type ComponentListEntry = {
  component: ContextComponent;
  packageNames?: string[];
};

/**
 * One band of the list: the rows of a single component type, under a header
 * that names it.
 *
 * The header is a row of the list rather than a heading above it. Both panes
 * group by type, and a package of a hundred components is read by running down
 * one continuous column: a bordered box per type turns that column into three,
 * each with its own edges to cross, and the eye loses the line it was following.
 */
export type ComponentListSection = {
  /** The React key, and what the header names: a component type. */
  key: string;
  label: string;
  icon?: ReactNode;
  /**
   * What the header prints beside the label. A node rather than a number, so a
   * band narrowed by a filter can say "2 of 44" without this file having to
   * know what a filter is.
   */
  count: ReactNode;
  entries: readonly ComponentListEntry[];
};

/**
 * The list of components, shared by a package's own content and by the
 * space-wide inventory. Extracted the day the second one appeared: two lists of
 * the same objects would have grown two row heights and two ideas of what a
 * version looks like.
 */
export function ContextComponentList({
  sections,
  showPackages = false,
  onMove,
  onRemove,
  selectedKeys,
  onToggleSelect,
}: Readonly<{
  sections: readonly ComponentListSection[];
  showPackages?: boolean;
  /**
   * Offered per list rather than per row, and only by a list that is scoped to
   * one package: read across the space a component can sit in none or in
   * several packages, so there is no source to move it out of.
   */
  onMove?: (component: ContextComponent) => void;
  /**
   * Taking a component back out of the package it is being read from, which
   * comes with `onMove` and under the same condition: there is a package to
   * leave only in a list scoped to one.
   */
  onRemove?: (component: ContextComponent) => void;
  /** Which rows are picked, by `componentSelectionKey`. */
  selectedKeys?: ReadonlySet<string>;
  /**
   * Picking a row, which is what turns the per-row move into a bulk one. Comes
   * with `selectedKeys` and under the same condition as `onMove`: the selection
   * only means something in a list that has a package to leave.
   */
  onToggleSelect?: (component: ContextComponent) => void;
}>) {
  /*
   * Asked for here rather than handed down, because the two panes that render
   * this list would then hold one map each for a fact neither of them uses.
   * The Context sidebar already runs this exact query for its `Review changes`
   * badge, and React Query keys it on the space, so a list of twenty rows adds
   * no request at all.
   *
   * Not `useListChangeProposalsBy{Standard,Command,Skill}Query`, which is what
   * a component's own header uses: those are keyed per artefact, so a list
   * would open one request per row to render one number.
   */
  const { data: groupedProposals } = useGetGroupedChangeProposalsQuery();
  const pendingReviews = useMemo(
    () => pendingReviewsByComponent(groupedProposals),
    [groupedProposals],
  );

  /*
   * The column exists when the space has something waiting, not when this list
   * does. Deciding per list was the first attempt and it is wrong: both panes
   * render one list per type, so a package holding a marked standard and an
   * unmarked command would reserve the width in one group and not in the next,
   * and the version column would step 42px sideways between two groups of one
   * pane. The eye runs down that column, and this file already says why its own
   * width is fixed.
   *
   * So the width is reserved everywhere or nowhere, and every row on the
   * surface keeps its version under the same x. What that costs is 42px of
   * description in a package where nothing is pending, in a space where
   * something is; what it buys is a column that never moves.
   */
  const showReviews = pendingReviews.size > 0;

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
    >
      {sections.map((section, sectionIndex) => (
        <Fragment key={section.key}>
          <SectionHeader section={section} isFirst={sectionIndex === 0} />
          {section.entries.map((entry) => (
            <ComponentRow
              key={componentSelectionKey(entry.component)}
              entry={entry}
              showPackages={showPackages}
              showReviews={showReviews}
              pendingReviews={
                pendingReviews.get(componentSelectionKey(entry.component)) ?? 0
              }
              onMove={onMove}
              onRemove={onRemove}
              isSelected={
                selectedKeys?.has(componentSelectionKey(entry.component)) ??
                false
              }
              onToggleSelect={onToggleSelect}
            />
          ))}
        </Fragment>
      ))}
    </PMBox>
  );
}

/**
 * The band header. Quieter than the rows it heads and tinted, so a long list
 * reads as runs of components separated by labels rather than as one table with
 * odd lines in it.
 */
function SectionHeader({
  section,
  isFirst,
}: Readonly<{ section: ComponentListSection; isFirst: boolean }>) {
  return (
    <PMHStack
      gap={2}
      align="center"
      paddingX={3}
      paddingY="5px"
      bg="background.secondary"
      borderTopWidth={isFirst ? '0' : '1px'}
      borderColor="border.tertiary"
    >
      {section.icon && (
        <PMIcon fontSize="xs" color="text.faded">
          {section.icon}
        </PMIcon>
      )}
      <PMText
        fontSize="10px"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wider"
        color="faded"
      >
        {section.label}
      </PMText>
      <PMText fontSize="10px" color="faded" fontVariantNumeric="tabular-nums">
        {section.count}
      </PMText>
    </PMHStack>
  );
}

function ComponentRow({
  entry,
  showPackages,
  showReviews,
  pendingReviews,
  onMove,
  onRemove,
  isSelected,
  onToggleSelect,
}: Readonly<{
  entry: ComponentListEntry;
  showPackages: boolean;
  /** Whether any row of this list is waiting on someone. */
  showReviews: boolean;
  /** How many proposals wait on this one, zero for most rows. */
  pendingReviews: number;
  onMove?: (component: ContextComponent) => void;
  onRemove?: (component: ContextComponent) => void;
  isSelected: boolean;
  onToggleSelect?: (component: ContextComponent) => void;
}>) {
  const { component, packageNames = [] } = entry;

  return (
    /*
     * The row is a link and its actions side by side, not a link with controls
     * inside it: a control nested in an anchor is activated by the anchor, so
     * opening the menu would first navigate away from the list it was opened
     * from. The hover sits on the pair so the row still lights up as one thing.
     */
    <PMHStack
      gap={0}
      align="stretch"
      borderTopWidth="1px"
      borderColor="border.tertiary"
      _hover={{ bg: 'background.secondary' }}
      // The picked row stays legible once the pointer has left it: the hover
      // tint alone would make the selection disappear the moment it is read.
      bg={isSelected ? 'background.secondary' : undefined}
      transition="background-color 150ms ease-out"
    >
      {onToggleSelect && (
        /*
          Beside the link and not inside it, for the reason the move button is:
          a control nested in an anchor is activated by the anchor, so ticking a
          row would open it.
        */
        <PMBox display="flex" alignItems="center" paddingLeft={3}>
          <PMCheckbox
            size="sm"
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(component)}
            inputProps={{ 'aria-label': `Select ${component.name}` }}
          />
        </PMBox>
      )}
      {/*
        A real link rather than a box that navigates: the name is the whole
        target area, so it has to be openable in a new tab and readable as an
        address by anything that reads addresses. PMBox does not forward `to`,
        hence the wrapper.
      */}
      <PMBox flex="1" minW={0} asChild>
        <Link to={component.href}>
          <PMBox
            display="flex"
            width="full"
            alignItems="center"
            gap={3}
            textAlign="left"
            paddingX={3}
            paddingY="7px"
          >
            {/*
              One line, name then summary, where the two were stacked. A package
              of a hundred components was four screens of scrolling, and the
              second line was the half of each row nobody was scanning for.

              No type icon on the row: the band header above it already says
              what these are, and repeating the glyph on every line spends the
              width the summary now needs.
            */}
            <PMText
              fontSize="sm"
              fontWeight="medium"
              truncate
              flexShrink={0}
              maxWidth="45%"
            >
              {component.name}
            </PMText>
            {/*
              Takes the room left over, and is the first thing to give it back:
              the name is what the reader came for, and a component with a long
              description must not push its own version off the row.
            */}
            <PMBox flex={1} minW={0}>
              {component.summary && (
                <PMText as="div" fontSize="xs" color="faded" truncate>
                  {component.summary}
                </PMText>
              )}
            </PMBox>
            {showPackages && <PackageColumn names={packageNames} />}
            {showReviews && <ReviewColumn count={pendingReviews} />}
            {/*
              A fixed width, not the width of the number: v12 is one character
              wider than v5, and every column to its left would move with it.
            */}
            <PMText
              fontSize="xs"
              color="faded"
              flexShrink={0}
              width="32px"
              textAlign="right"
              fontVariantNumeric="tabular-nums"
            >
              v{component.version}
            </PMText>
            <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
              <LuChevronRight />
            </PMIcon>
          </PMBox>
        </Link>
      </PMBox>
      {(onMove || onRemove) && (
        <PMBox display="flex" alignItems="center" paddingRight={2}>
          {/*
            A menu, where moving alone was a single icon. Two ghost icons a few
            pixels apart, told apart only by their glyph, is not how to offer
            "put this somewhere else" beside "take this out of here": the two
            read the same at a glance and one of them changes what gets
            distributed. The detail view already answers "more than one thing to
            do with this component" this way.
          */}
          <PMMenu.Root>
            <PMMenu.Trigger asChild>
              <PMIconButton
                aria-label={`More actions for ${component.name}`}
                variant="ghost"
                size="xs"
                color="text.faded"
              >
                <LuEllipsisVertical />
              </PMIconButton>
            </PMMenu.Trigger>
            <PMPortal>
              <PMMenu.Positioner>
                <PMMenu.Content>
                  {onMove && (
                    <PMMenu.Item
                      value="move-component"
                      onClick={() => onMove(component)}
                    >
                      <PMHStack gap={2}>
                        <PMIcon>{COMPONENT_ACTION_ICONS.move}</PMIcon>
                        Move to another package
                      </PMHStack>
                    </PMMenu.Item>
                  )}
                  {onRemove && (
                    <PMMenu.Item
                      value="remove-component"
                      onClick={() => onRemove(component)}
                    >
                      <PMHStack gap={2}>
                        <PMIcon>{COMPONENT_ACTION_ICONS.remove}</PMIcon>
                        Remove from package
                      </PMHStack>
                    </PMMenu.Item>
                  )}
                </PMMenu.Content>
              </PMMenu.Positioner>
            </PMPortal>
          </PMMenu.Root>
        </PMBox>
      )}
    </PMHStack>
  );
}

/**
 * Whether someone is waiting on this component.
 *
 * The rail's `AttentionMark` decided how this surface notes an exception in the
 * margin of an index of content, and this is the same mark for a different
 * fact: a dot that carries the colour, a number that carries the quantity in
 * the neutral ramp, and a tooltip that is the whole sentence, because "2" on
 * its own is not one. The three dedicated lists spell it with a solid yellow
 * badge, which is right for a table column headed `Pending reviews` and wrong
 * for a dense row in a low-chrome pane.
 *
 * The colour is `branding.primary`, the surface's one accent, because the
 * component's own header already spends it on exactly this fact. Not the rail's
 * orange: that one means something it was sent to has drifted, and two facts
 * wearing one colour would make both unreadable.
 *
 * Not a link, and this is the deliberate departure from the three lists. A row
 * has one destination, which is the component; giving the mark a second one
 * would make the row's target depend on which 8 pixels the pointer landed on.
 * The reader opens the component and its header carries the link, spelled out
 * in full, which is the longer form this mark is the short version of.
 *
 * Absent at zero, not a zero. Most rows have nothing pending, and a column of
 * zeroes would teach the eye to skip the one row that has a number. It is also
 * what makes the OSS edition correct for free: its stub answers nothing, no row
 * has a count, and the column never appears.
 */
function ReviewColumn({ count }: Readonly<{ count: number }>) {
  const label = reviewChangesLabel(count);

  return (
    <PMBox
      flexShrink={0}
      /*
       * Room for two digits and no more. A component with a hundred proposals
       * open is not a case worth widening every row for; the tooltip and the
       * header both still say the number.
       */
      width="30px"
      display="flex"
      alignItems="center"
      justifyContent="flex-end"
      gap="6px"
    >
      {count > 0 && (
        <PMTooltip label={label} showArrow>
          <PMBox
            display="flex"
            alignItems="center"
            gap="6px"
            role="img"
            aria-label={label}
          >
            <PMBox
              width="8px"
              height="8px"
              borderRadius="full"
              bg="branding.primary"
              flexShrink={0}
              aria-hidden
            />
            <PMText
              fontSize="xs"
              color="faded"
              fontVariantNumeric="tabular-nums"
            >
              {count}
            </PMText>
          </PMBox>
        </PMTooltip>
      )}
    </PMBox>
  );
}

/**
 * Who carries this component. A column rather than a word on the second line:
 * read across the space, the owner is what the eye runs down.
 *
 * The empty case is the one that matters. A component in no package is
 * distributed to nobody, and this list is the only place in the plugin-first
 * navigation where it appears at all — so it says so in words rather than
 * leaving the cell blank, which would read as a rendering gap.
 */
function PackageColumn({ names }: Readonly<{ names: string[] }>) {
  const label =
    names.length === 0
      ? 'In no package'
      : names.length === 1
        ? names[0]
        : `${names.length} packages`;

  return (
    <PMBox
      flexShrink={0}
      width="180px"
      minW={0}
      display="flex"
      alignItems="center"
      gap="6px"
      color={names.length === 0 ? 'text.secondary' : 'text.faded'}
    >
      <PMIcon fontSize="xs" flexShrink={0}>
        <LuPackage />
      </PMIcon>
      <PMBox
        as="span"
        fontSize="xs"
        truncate
        // The whole list on hover: "3 packages" is the scannable form, but which
        // three is a fair question to ask without leaving the row.
        title={names.length > 1 ? names.join(', ') : undefined}
        fontStyle={names.length === 0 ? 'italic' : undefined}
      >
        {label}
      </PMBox>
    </PMBox>
  );
}
