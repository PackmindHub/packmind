import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
  PMBox,
  PMButton,
  PMFeatureFlag,
  PMHStack,
  PMHeading,
  PMIcon,
  PMIconButton,
  PMMarkdownViewer,
  PMMenu,
  PMPortal,
  PMSpinner,
  PMTabsCompound,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuChevronDown,
  LuChevronLeft,
  LuEllipsisVertical,
  LuExternalLink,
  LuMessageSquarePlus,
  LuPencil,
  LuTrash2,
} from 'react-icons/lu';
import type {
  Command,
  CommandId,
  OrganizationId,
  Rule,
  SkillId,
  SpaceId,
  StandardId,
  WithTimestamps,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import {
  useGetCommandByIdQuery,
  useGetCommandVersionsQuery,
} from '../../../commands/api/queries/CommandsQueries';
import { ProposeChangeModal } from '../../../commands/components/ProposeChangeModal';
import { ProposeDescriptionChangeModal } from '../../../commands/components/ProposeDescriptionChangeModal';
import {
  useGetSkillVersionsQuery,
  useGetSkillWithFilesByIdQuery,
} from '../../../skills/api/queries/SkillsQueries';
import { SkillFrontmatterInfo } from '../../../skills/components/SkillFrontmatterInfo';
import { SkillFileEditor } from '../../../skills/components/SkillFileEditor';
import { SKILL_MD_FILENAME } from '../../../skills/utils/skillMdUtils';
import { useCanEditSkillFiles } from '../../../skills/hooks/useCanEditSkillFiles';
import { DownloadSkillPopover } from '../../../skills/components/DownloadSkillPopover';
import { CommandFrontmatterInfo } from '../../../commands/components/CommandFrontmatterInfo';
import { parseCommandFrontmatter } from '../../../commands/utils/parseCommandFrontmatter';
import {
  useGetRulesByStandardIdQuery,
  useGetStandardByIdQuery,
  useGetStandardVersionsQuery,
} from '../../../standards/api/queries/StandardsQueries';
import {
  DISTRIBUTION_TAB,
  HISTORY_TAB,
  INSTRUCTIONS_TAB,
  sortRulesByContent,
} from './buildComponentDetail';
import {
  displayNamesById,
  historyAuthor,
  historyEntries,
  type HistoryCommit,
  type HistoryEntry,
} from './componentHistory';
import {
  REVIEW_ARTEFACT_TYPES,
  componentUpdatedAt,
  pendingProposalCount,
  reviewChangesLabel,
} from './componentMaintenance';
import {
  UNDETECTED_RULE,
  ruleDetectionLabel,
  ruleDetectionOpens,
  ruleDetectionsById,
  type RuleDetection,
} from './ruleDetection';
import {
  RuleDetectionLanguages,
  RuleDetectionMark,
} from './RuleDetectionLanguages';
import type { ContextComponent } from './buildPackageContext';
import { COMPONENT_TYPE_LABELS_SINGULAR } from './buildPackageContext';
import {
  COMPONENT_ACTION_ICONS,
  COMPONENT_TYPE_ICONS,
} from './ContextComponentList';
import {
  useListCommandDistributionsQuery,
  useListSkillDistributionsQuery,
  useListStandardDistributionsQuery,
} from '../../api/queries/DeploymentsQueries';
import { CommandDistributionsList } from '../CommandDistributionsList/CommandDistributionsList';
import { SkillDistributionsList } from '../SkillDistributionsList/SkillDistributionsList';
import { StandardDistributionsList } from '../StandardDistributionsList/StandardDistributionsList';
import { formatRelativeDate } from '../redesign/selectors/installDriftEntries';
import { routes } from '../../../../shared/utils/routes';
import { CopyMarkdownButton } from '../../../artifacts/components/CopyMarkdownButton';
import { serializeStandardToMarkdown } from '@packmind/proprietary/frontend/domain/change-proposals/utils/serializeArtifactToMarkdown';
import {
  useListChangeProposalsByCommandQuery,
  useListChangeProposalsBySkillQuery,
  useListChangeProposalsByStandardQuery,
} from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { getLanguageDisplayName } from '@packmind/proprietary/frontend/domain/detection/components/DetectionCardUtils';
import {
  hasRuleDetection,
  useGetStandardRulesDetectionStatusQuery,
} from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';

/**
 * One component, read inside the package that carries it.
 *
 * The frame is the same for every type: where it comes from, what it is, what
 * can be done to it. Only the tab bodies change, and which body to render is
 * the one thing this file decides per type. A new type is a new case in
 * `ComponentBody`, a new case in `ComponentDistribution`, and a flipped entry
 * in `RENDERS_IN_PANE`, not a new screen.
 *
 * It replaces the package's tab strip with one of its own rather than sitting
 * under it: Content and Distribution are two ways of reading the package, and
 * neither is what is on screen while a component is open. The back link is what
 * says so, and it names the package rather than saying "Back", because that is
 * the information.
 */
export function ContextComponentDetail({
  component,
  backLabel,
  backHref,
  ruleHref,
  editHref,
  tab,
  onTabChange,
  orgSlug,
  spaceSlug,
  moveLabel,
  onMove,
  onRemove,
  onDelete,
}: Readonly<{
  component: ContextComponent;
  /**
   * What the back link names, which is where it goes: the package this
   * component is being read in, or the inventory when no package carries it.
   * The label rather than the package, because the second case has none, and
   * because a link that names its destination is the information.
   */
  backLabel: string;
  /** Where that link goes, tab and all. */
  backHref: string;
  /**
   * Where one rule of a standard opens in the pane.
   *
   * Built by the pane, like every other link on this frame, because it is an
   * address of this surface: this component never touches the address, so it
   * cannot drop a parameter the surface put there. It was a page route until
   * the pane grew a depth for a rule, and the pane is what knows the
   * difference.
   */
  ruleHref: (ruleId: Rule['id']) => string;
  /** Null for a type with no edit route of its own. */
  editHref: string | null;
  /**
   * Which of the two tabs is open. Owned by the pane rather than read here,
   * for the reason every other link on this frame is handed in already built:
   * this component does not touch the address, so it cannot drop a parameter
   * the surface put there.
   */
  tab: string;
  onTabChange: (value: string) => void;
  /** Both slugs, for the distribution lists, which link out to destinations. */
  orgSlug: string;
  spaceSlug: string;
  /**
   * `Move` inside a package and `Add to package` outside one. The same drawer
   * either way: what changes is whether the component is also leaving
   * somewhere, and the word has to say which, because "move" a component that
   * is nowhere is a sentence about a place that does not exist.
   */
  moveLabel: string;
  onMove: () => void;
  /**
   * Taking this component out of the package named in the back link, which is
   * where the reader lands once it is gone from here.
   *
   * Null when there is no package to take it out of. Absent rather than
   * disabled: a greyed item is an affordance saying the reader could do this
   * under some condition they are meant to guess at, and here there is no such
   * condition.
   */
  onRemove: (() => void) | null;
  onDelete: () => void;
}>) {
  const label = COMPONENT_TYPE_LABELS_SINGULAR[component.type];
  const { organization, user } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  /*
   * Held by the frame and not by the menu item that opens it. The menu unmounts
   * its content when it closes, and the click that opens a drawer mounted in
   * there is the same click that closes the menu.
   */
  const [proposeNameOpen, setProposeNameOpen] = useState(false);
  const [proposeInstructionsOpen, setProposeInstructionsOpen] = useState(false);

  return (
    /*
     * The same arrangement the package pane uses: header and strip held in
     * place, only the tab body below them moving. Laid out here rather than by
     * the pane, so the frame owns its own scroll and the pane hands it a slot.
     */
    <PMTabsCompound.Root
      value={tab}
      onValueChange={(details) => onTabChange(details.value)}
      variant="line"
      height="100%"
      minH={0}
      display="flex"
      flexDirection="column"
      lazyMount
      unmountOnExit
    >
      <PMBox paddingX={6} paddingTop={6} flexShrink={0}>
        <PMBox
          display="inline-flex"
          alignItems="center"
          gap="4px"
          fontSize="sm"
          color="text.faded"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          asChild
        >
          <Link to={backHref}>
            <PMIcon fontSize="sm">
              <LuChevronLeft />
            </PMIcon>
            {backLabel}
          </Link>
        </PMBox>

        <PMHStack align="start" justify="space-between" gap={6} paddingTop={2}>
          <PMBox minW={0} maxWidth="68ch">
            <PMHeading level="h2">{component.name}</PMHeading>
            <PMHStack gap={2} paddingTop={2} align="center" wrap="wrap">
              <PMHStack gap="6px" align="center">
                <PMIcon fontSize="xs" color="text.faded">
                  {COMPONENT_TYPE_ICONS[component.type]}
                </PMIcon>
                <PMText fontSize="sm" color="secondary">
                  {label}
                </PMText>
              </PMHStack>
              <MetaSeparator />
              <PMText fontSize="sm" color="faded">
                v{component.version}
              </PMText>
              {/*
                Whether anyone is looking after this component. Beside the
                version rather than on a line of its own, because a version
                number and the date it was cut are one fact read together, and
                a proposal waiting on someone is the only thing in this row
                worth interrupting for.
              */}
              <ComponentMaintenance
                component={component}
                orgSlug={orgSlug}
                spaceSlug={spaceSlug}
              />
              {/*
              No repository count here. Where a component landed is a property of
              the package, one level up, and printing it on the component is
              what used to make people think a component is distributed alone.
            */}
            </PMHStack>
            {/*
            And no summary either. For a standard and a skill the row's summary
            is the entity's description, which is the first thing the body below
            prints: on screen it read as the same paragraph twice.
          */}
          </PMBox>

          <PMHStack gap={2} flexShrink={0}>
            {/*
            No "Open standard" here any more, nor its two siblings.

            The button was the surprise this whole redesign is about: it sat in
            the header of a component, read as the way to open that component,
            and led to a page whose first screen was a second copy of what the
            reader was already looking at. Everything about it that was not a
            copy has since arrived here: where it landed, its history, whether
            anyone is looking after it, whether its rules are detected, its
            download, both of its change proposals.

            What is left of those pages is the setting up of a standard's rules,
            and the link to that is beside the rules, named after the work.
          */}
            {/*
              Taking the skill away with you, for the agent you actually run.
              The one control the skill's own page had that this frame did not,
              and the reason that page could not be let go of: a reader who came
              here to fetch a skill had to leave to fetch it.

              Its own popover rather than a menu item, because what it asks is
              which agent, and the answer is three icons wide.
            */}
            {component.type === 'skill' && organization && spaceId && (
              <DownloadSkillPopover
                skillId={component.key as SkillId}
                organizationId={organization.id}
                spaceId={spaceId}
              />
            )}
            {/*
              The same move for the type whose content is one file: taking the
              standard away as the file an agent reads.

              It was on the rules page until the prose block that carried it
              went, and that block was the only place in the product that would
              hand a standard over as text. The pane is where a standard is read
              now, so this is where it belongs.
            */}
            {component.type === 'standard' && (
              <CopyStandardMarkdown
                standardId={component.key as StandardId}
                name={component.name}
              />
            )}
            <PMButton variant="secondary" size="sm" onClick={onMove}>
              {moveLabel}
            </PMButton>
            {editHref && (
              <PMButton variant="primary" size="sm" asChild>
                <Link to={editHref}>Edit</Link>
              </PMButton>
            )}
            {/*
            Deleting, behind a menu for the same reason the package's own
            deletion is: it is the one action here that destroys what the screen
            is showing, and it should not sit one stray click away from Edit.

            It was only reachable from the component's own page until now, which
            made deleting the one maintenance task that forced the reader out of
            this surface.
          */}
            <PMMenu.Root>
              <PMMenu.Trigger asChild>
                <PMIconButton
                  aria-label={`More actions for ${component.name}`}
                  variant="tertiary"
                  size="sm"
                >
                  <LuEllipsisVertical />
                </PMIconButton>
              </PMMenu.Trigger>
              <PMPortal>
                <PMMenu.Positioner>
                  <PMMenu.Content>
                    {/*
                    Above the deletion and not coloured like it, because the two
                    are one word apart and only one of them destroys anything:
                    this one takes the component out of one package, the other
                    takes it out of the space.
                  */}
                    {/*
                    Proposing a change instead of making one, for a reader
                    without the standing to edit or without the certainty. Only
                    on a command, and named after the field it changes: the
                    capability exists for one type and one field today, and the
                    command's own page hides that behind two identical "Propose
                    change" links, one of which renames and one of which edits
                    the description. An affordance the other two types cannot
                    honour is worse than an absent one, so it is absent there.
                  */}
                    {component.type === 'command' && (
                      <PMFeatureFlag
                        featureKeys={[
                          ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY,
                        ]}
                        featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
                        userEmail={user?.email}
                      >
                        <PMMenu.Item
                          value="propose-name-change"
                          onClick={() => setProposeNameOpen(true)}
                        >
                          <PMHStack gap={2}>
                            <PMIcon>
                              <LuMessageSquarePlus />
                            </PMIcon>
                            Propose name change
                          </PMHStack>
                        </PMMenu.Item>
                        {/*
                          The second field a change can be proposed on, and the
                          other half of what the command's page hid behind two
                          identical "Propose change" links. Named after the tab
                          it edits rather than after the domain, which calls it
                          the description while the modal is handed the whole
                          content: what the reader changes is what the
                          Instructions tab above is showing.
                        */}
                        <PMMenu.Item
                          value="propose-instructions-change"
                          onClick={() => setProposeInstructionsOpen(true)}
                        >
                          <PMHStack gap={2}>
                            <PMIcon>
                              <LuMessageSquarePlus />
                            </PMIcon>
                            Propose instructions change
                          </PMHStack>
                        </PMMenu.Item>
                      </PMFeatureFlag>
                    )}
                    {onRemove && (
                      <PMMenu.Item value="remove-component" onClick={onRemove}>
                        <PMHStack gap={2}>
                          <PMIcon>{COMPONENT_ACTION_ICONS.remove}</PMIcon>
                          Remove from package
                        </PMHStack>
                      </PMMenu.Item>
                    )}
                    <PMMenu.Item
                      value="delete-component"
                      color="text.error"
                      onClick={onDelete}
                    >
                      <PMHStack gap={2}>
                        <PMIcon>
                          <LuTrash2 />
                        </PMIcon>
                        {`Delete ${label.toLowerCase()}`}
                      </PMHStack>
                    </PMMenu.Item>
                  </PMMenu.Content>
                </PMMenu.Positioner>
              </PMPortal>
            </PMMenu.Root>
            {/*
              Beside the menu that opens it rather than at the end of the file,
              which is where the component's own page keeps its dialogs too. It
              portals out, so it adds nothing to this row.
            */}
            {component.type === 'command' && (
              <CommandProposals
                component={component}
                nameOpen={proposeNameOpen}
                onNameOpenChange={setProposeNameOpen}
                instructionsOpen={proposeInstructionsOpen}
                onInstructionsOpenChange={setProposeInstructionsOpen}
              />
            )}
          </PMHStack>
        </PMHStack>

        {/*
          No divider under the header any more. The strip's own line is the
          separation, and two rules a few pixels apart read as a mistake.
        */}
        <PMBox paddingTop={5}>
          <PMTabsCompound.List>
            <PMTabsCompound.Trigger value={INSTRUCTIONS_TAB}>
              Instructions
            </PMTabsCompound.Trigger>
            <PMTabsCompound.Trigger value={DISTRIBUTION_TAB}>
              Distribution
              {/*
                A plain number and not a badge, the same as the package's own
                Components count: this is the size of the half you are not
                looking at, not something to go and fix. The coloured badge on
                the package's Distribution tab means the opposite, and the two
                must not be confused for each other.
              */}
              <DistributionCount component={component} />
            </PMTabsCompound.Trigger>
            {/*
              No count on this one. The number of versions is the `v4` in the
              header two lines up, and printing it twice would invite the
              reader to check whether the two agree.
            */}
            <PMTabsCompound.Trigger value={HISTORY_TAB}>
              History
            </PMTabsCompound.Trigger>
          </PMTabsCompound.List>
        </PMBox>
      </PMBox>

      <PMTabsCompound.Content
        value={INSTRUCTIONS_TAB}
        flex="1"
        minH={0}
        overflowY="auto"
        paddingX={6}
        paddingY={5}
      >
        <ComponentBody component={component} ruleHref={ruleHref} />
      </PMTabsCompound.Content>

      <PMTabsCompound.Content
        value={DISTRIBUTION_TAB}
        flex="1"
        minH={0}
        overflowY="auto"
        paddingX={6}
        paddingY={5}
      >
        <ComponentDistribution
          component={component}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      </PMTabsCompound.Content>

      <PMTabsCompound.Content
        value={HISTORY_TAB}
        flex="1"
        minH={0}
        overflowY="auto"
        paddingX={6}
        paddingY={5}
      >
        <ComponentHistory component={component} />
      </PMTabsCompound.Content>
    </PMTabsCompound.Root>
  );
}

function ComponentBody({
  component,
  ruleHref,
}: Readonly<{
  component: ContextComponent;
  /** Where one rule of a standard opens, built by the pane. */
  ruleHref: (ruleId: Rule['id']) => string;
}>) {
  switch (component.type) {
    case 'command':
      return <CommandBody commandId={component.key as CommandId} />;
    case 'standard':
      return (
        <StandardBody
          standardId={component.key as StandardId}
          ruleHref={ruleHref}
        />
      );
    case 'skill':
      return <SkillBody skillId={component.key as SkillId} />;
  }
}

/** The heading of a section inside a body, the same in every type. */
function BodySectionLabel({ children }: Readonly<{ children: string }>) {
  return (
    <PMText
      as="div"
      fontSize="10px"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wider"
      color="faded"
    >
      {children}
    </PMText>
  );
}

/**
 * The two changes a reader without the standing to edit can propose on a
 * command, and the modals that take them.
 *
 * A component of its own because the second one needs the command itself: the
 * modal is handed the content to diff a proposal against, and the frame above
 * carries a row, not an entity. Querying it here rather than in the frame keeps
 * the request off the two types that have nothing to propose, and React Query
 * answers it from the same cache entry the Instructions tab reads.
 *
 * Both mounted beside the menu that opens them, which is where the command's
 * own page keeps its dialogs too. They portal out, so they add nothing to the
 * row they sit in.
 */
function CommandProposals({
  component,
  nameOpen,
  onNameOpenChange,
  instructionsOpen,
  onInstructionsOpenChange,
}: Readonly<{
  component: ContextComponent;
  nameOpen: boolean;
  onNameOpenChange: (open: boolean) => void;
  instructionsOpen: boolean;
  onInstructionsOpenChange: (open: boolean) => void;
}>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const { data: command } = useGetCommandByIdQuery(component.key as CommandId);

  if (!organization || !spaceId) return null;

  return (
    <>
      <ProposeChangeModal
        commandName={component.name}
        recipeId={component.key as CommandId}
        organizationId={organization.id}
        spaceId={spaceId}
        open={nameOpen}
        onOpenChange={({ open }) => onNameOpenChange(open)}
      />
      {/*
        Only once the content has arrived. The modal opens on it as its starting
        point and calls anything else a change, so mounting it empty would offer
        to replace the command's instructions with nothing.
      */}
      {command && (
        <ProposeDescriptionChangeModal
          commandDescription={command.content}
          recipeId={component.key as CommandId}
          organizationId={organization.id}
          spaceId={spaceId}
          open={instructionsOpen}
          onOpenChange={({ open }) => onInstructionsOpenChange(open)}
        />
      )}
    </>
  );
}

/** The dot between two facts in the meta row. */
function MetaSeparator() {
  return (
    <PMText fontSize="sm" color="faded" aria-hidden>
      &middot;
    </PMText>
  );
}

/**
 * Whether this component is being looked after, and whether it is waiting on
 * anyone.
 *
 * Per type for the reason `DistributionCount` is: two queries per type, three
 * different ids, and a hook cannot be called conditionally. Each of the three
 * below calls exactly two and hands the same two facts back.
 *
 * Both queries are the ones the component's own page runs, by the same ids, so
 * the pane and the page cannot disagree about how fresh a component is or how
 * many proposals are open on it.
 */
function ComponentMaintenance({
  component,
  orgSlug,
  spaceSlug,
}: Readonly<{
  component: ContextComponent;
  orgSlug: string;
  spaceSlug: string;
}>) {
  /*
   * Built here rather than in each of the three, and built whether or not
   * anything is pending: the count decides if the link renders, not where it
   * goes.
   */
  const reviewHref = routes.space.toReviewChangesArtefact(
    orgSlug,
    spaceSlug,
    REVIEW_ARTEFACT_TYPES[component.type],
    component.key,
  );

  switch (component.type) {
    case 'command':
      return (
        <CommandMaintenance
          commandId={component.key as CommandId}
          reviewHref={reviewHref}
        />
      );
    case 'standard':
      return (
        <StandardMaintenance
          standardId={component.key as StandardId}
          reviewHref={reviewHref}
        />
      );
    case 'skill':
      return (
        <SkillMaintenance
          skillId={component.key as SkillId}
          reviewHref={reviewHref}
        />
      );
  }
}

/**
 * The two facts, or as many of them as are true.
 *
 * Each carries its own separator, so a component with no date and nothing
 * pending leaves the row exactly as it was rather than ending it on a dot.
 *
 * The pending link is the one thing on this header allowed to leave the
 * surface, and it is allowed because it leaves to a sidebar entry: reviewing a
 * proposal is its own piece of work, with its own screen, and pretending
 * otherwise would put a diff viewer in a pane. It is also the only accent on
 * this surface, which is the point. Everything else here is a fact; this one is
 * someone waiting.
 */
function MaintenanceMeta({
  updatedAt,
  pending,
  reviewHref,
}: Readonly<{
  /** Null when the entity sent no date, which is ordinary for a command. */
  updatedAt: string | null;
  pending: number;
  reviewHref: string;
}>) {
  return (
    <>
      {updatedAt && (
        <>
          <MetaSeparator />
          <PMText fontSize="sm" color="faded">
            {`updated ${formatRelativeDate(updatedAt)}`}
          </PMText>
        </>
      )}
      {pending > 0 && (
        <>
          <MetaSeparator />
          <PMBox
            fontSize="sm"
            color="branding.primary"
            _hover={{ textDecoration: 'underline' }}
            asChild
          >
            <Link to={reviewHref}>{reviewChangesLabel(pending)}</Link>
          </PMBox>
        </>
      )}
    </>
  );
}

function CommandMaintenance({
  commandId,
  reviewHref,
}: Readonly<{ commandId: CommandId; reviewHref: string }>) {
  const { data: command } = useGetCommandByIdQuery(commandId);
  const { data: proposals } = useListChangeProposalsByCommandQuery(commandId);

  return (
    <MaintenanceMeta
      /*
       * Cast because `Command` does not declare the timestamp its own table
       * carries, which is what `CommandVersionHistoryHeader` and `CommandsList`
       * both work around the same way. The cast promises a date; the reader it
       * is handed to does not believe it, and answers null when none arrives.
       */
      updatedAt={componentUpdatedAt(
        command as WithTimestamps<Command> | undefined,
      )}
      pending={pendingProposalCount(proposals)}
      reviewHref={reviewHref}
    />
  );
}

function StandardMaintenance({
  standardId,
  reviewHref,
}: Readonly<{ standardId: StandardId; reviewHref: string }>) {
  const { data } = useGetStandardByIdQuery(standardId);
  const { data: proposals } = useListChangeProposalsByStandardQuery(standardId);

  return (
    <MaintenanceMeta
      updatedAt={componentUpdatedAt(data?.standard)}
      pending={pendingProposalCount(proposals)}
      reviewHref={reviewHref}
    />
  );
}

/*
 * The skill's date comes off the skill and not off its latest version, which is
 * the one the Distribution tab reads for a slug. A version is cut when the
 * folder changes, and the row moves with it: the two answer the same question
 * here, and the entity is the one that also moves when a file is renamed.
 */
function SkillMaintenance({
  skillId,
  reviewHref,
}: Readonly<{ skillId: SkillId; reviewHref: string }>) {
  const { data } = useGetSkillWithFilesByIdQuery(skillId);
  const { data: proposals } = useListChangeProposalsBySkillQuery(skillId);

  return (
    <MaintenanceMeta
      updatedAt={componentUpdatedAt(data?.skill)}
      pending={pendingProposalCount(proposals)}
      reviewHref={reviewHref}
    />
  );
}

/**
 * How many places this one component reached, on the tab that lists them.
 *
 * Per type rather than one call with a switch inside it, for the reason the
 * bodies below are: a hook cannot be called conditionally, and the three
 * queries take three different ids. One component per type calls exactly one.
 *
 * It sits on the trigger rather than in the body, so it is outside the lazy
 * mount and answers before the tab is ever opened. That is the whole point of
 * it: whether a component has been distributed at all is the question a reader
 * has before they decide to look.
 */
function DistributionCount({
  component,
}: Readonly<{ component: ContextComponent }>) {
  switch (component.type) {
    case 'command':
      return (
        <CommandDistributionCount commandId={component.key as CommandId} />
      );
    case 'standard':
      return (
        <StandardDistributionCount standardId={component.key as StandardId} />
      );
    case 'skill':
      return <SkillDistributionCount skillId={component.key as SkillId} />;
  }
}

/**
 * The number itself, or nothing at all.
 *
 * Nothing rather than a zero: a component that has not been distributed is the
 * ordinary state of one just written, and a "0" on the tab reads as a count
 * that failed to load. The tab body says it in words instead.
 */
function TabCount({ value }: Readonly<{ value: number | undefined }>) {
  if (!value) return null;

  return (
    <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
      {value}
    </PMText>
  );
}

function CommandDistributionCount({
  commandId,
}: Readonly<{ commandId: CommandId }>) {
  const { data } = useListCommandDistributionsQuery(commandId);
  return <TabCount value={data?.length} />;
}

function StandardDistributionCount({
  standardId,
}: Readonly<{ standardId: StandardId }>) {
  const { data } = useListStandardDistributionsQuery(standardId);
  return <TabCount value={data?.length} />;
}

function SkillDistributionCount({ skillId }: Readonly<{ skillId: SkillId }>) {
  const { data } = useListSkillDistributionsQuery(skillId);
  return <TabCount value={data?.length} />;
}

/**
 * Where this one component went, and under what name an agent reads it.
 *
 * A different question from the package's own Distribution tab, which asks
 * whether a whole set of components reached a set of repositories. This one
 * asks where a single file can be found, and it is the question that used to
 * force a reader onto the component's own page.
 */
function ComponentDistribution({
  component,
  orgSlug,
  spaceSlug,
}: Readonly<{
  component: ContextComponent;
  orgSlug: string;
  spaceSlug: string;
}>) {
  switch (component.type) {
    case 'command':
      return (
        <CommandDistribution
          commandId={component.key as CommandId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      );
    case 'standard':
      return (
        <StandardDistribution
          standardId={component.key as StandardId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      );
    case 'skill':
      return (
        <SkillDistribution
          skillId={component.key as SkillId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
        />
      );
  }
}

/**
 * The path a coding agent reads this component from.
 *
 * Named as the Packmind one rather than as "the" path, because it is not the
 * only one: every render mode writes the same component somewhere of its own,
 * and calling one of them the path is exactly the smoothing of agent
 * differences the product exists to refuse. The list below names the formats
 * each destination received.
 *
 * No scope line beside it. A standard's scope is a property of the standard and
 * is already the first thing its Instructions tab prints; a command's is the
 * literal `**\/*` for every command there is, which is not information.
 */
function DistributedAs({ path }: Readonly<{ path: string }>) {
  return (
    <PMBox>
      <BodySectionLabel>Distributed as</BodySectionLabel>
      <PMText as="div" fontSize="sm" fontFamily="mono" paddingTop={1}>
        {path}
      </PMText>
      <PMText as="div" fontSize="xs" color="secondary" paddingTop={1}>
        The Packmind path. Each agent reads this component from one of its own.
      </PMText>
    </PMBox>
  );
}

/**
 * The frame the three types share: the path, then either the landings or the
 * reason there are none.
 *
 * The path is conditional and carries no spinner of its own on purpose. It
 * needs the entity only for a slug, and a failed slug must not empty a tab
 * whose subject is the list underneath it.
 *
 * The count decides which half renders, and `undefined` is not zero: while the
 * query is in flight nothing is claimed, so the list stands with its own
 * spinner and neither the empty state nor the scope line flashes on the way in.
 */
function DistributionBody({
  path,
  count,
  children,
}: Readonly<{
  path: string | null;
  /** Undefined while the landings are still being fetched. */
  count: number | undefined;
  children: ReactNode;
}>) {
  if (count === 0) {
    return (
      <PMVStack gap={6} align="stretch" maxWidth="72ch">
        {path && <DistributedAs path={path} />}
        {/*
          Not `DeploymentsHistory`'s own empty state, which is centred, bold,
          and reads as a query that failed. Nothing failed here: this is the
          ordinary state of a component just written, and the line says what
          would send it rather than reporting an absence.
        */}
        <PMText as="div" fontSize="sm" color="secondary">
          Not distributed yet. A component travels inside a package, so
          distributing a package that carries this one is what sends it.
        </PMText>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="stretch">
      {path && <DistributedAs path={path} />}
      <PMVStack gap={2} align="stretch">
        {/*
          Said because the frame around it says something else. The back link
          names the package the component was opened from, and these rows can
          name a different one: a component sits in several packages, and this
          is every landing of it rather than the ones this package caused.
          Filtering to the open package would be the alternative, and it would
          hide real landings.

          Held back until the count is known, so it does not appear above a
          spinner that resolves to nothing.
        */}
        {count !== undefined && (
          <PMText as="div" fontSize="xs" color="secondary">
            Every landing of this component, whichever package sent it. The
            Package column says which.
          </PMText>
        )}
        {children}
      </PMVStack>
    </PMVStack>
  );
}

function CommandDistribution({
  commandId,
  orgSlug,
  spaceSlug,
}: Readonly<{ commandId: CommandId; orgSlug: string; spaceSlug: string }>) {
  const { data: command } = useGetCommandByIdQuery(commandId);
  /*
   * The same query the tab's own count runs, by the same id, so React Query
   * answers both from one request. Asked for here because the frame needs the
   * number to decide which half of itself to render, and the list below it
   * cannot report upward.
   */
  const { data: landings } = useListCommandDistributionsQuery(commandId);

  return (
    <DistributionBody
      path={command?.slug ? `.packmind/recipes/${command.slug}.md` : null}
      count={landings?.length}
    >
      <CommandDistributionsList
        recipeId={commandId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    </DistributionBody>
  );
}

function StandardDistribution({
  standardId,
  orgSlug,
  spaceSlug,
}: Readonly<{ standardId: StandardId; orgSlug: string; spaceSlug: string }>) {
  const { data } = useGetStandardByIdQuery(standardId);
  const slug = data?.standard?.slug;
  const { data: landings } = useListStandardDistributionsQuery(standardId);

  return (
    <DistributionBody
      path={slug ? `.packmind/standards/${slug}.md` : null}
      count={landings?.length}
    >
      <StandardDistributionsList
        standardId={standardId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    </DistributionBody>
  );
}

/**
 * A skill is a folder, so its path is one, trailing slash and all. The files
 * inside it are the rail, which is where they belong: this tab is about where
 * the folder landed, not what is in it.
 */
function SkillDistribution({
  skillId,
  orgSlug,
  spaceSlug,
}: Readonly<{ skillId: SkillId; orgSlug: string; spaceSlug: string }>) {
  const { data } = useGetSkillWithFilesByIdQuery(skillId);
  const slug = data?.latestVersion.slug;
  const { data: landings } = useListSkillDistributionsQuery(skillId);

  return (
    <DistributionBody
      path={slug ? `.packmind/skills/${slug}/` : null}
      count={landings?.length}
    >
      <SkillDistributionsList
        skillId={skillId}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
      />
    </DistributionBody>
  );
}

/**
 * What has been done to this component, and when.
 *
 * A tab and not a drawer. Version history has lived behind a `See History` link
 * on all three pages, which is a screen on top of a screen for information one
 * column wide. Here it sits beside the instructions and the landings, which is
 * the whole of what there is to know about a component.
 *
 * Per type, for the reason the other two families are: three queries, three
 * ids, and a hook cannot be called conditionally.
 */
function ComponentHistory({
  component,
}: Readonly<{ component: ContextComponent }>) {
  switch (component.type) {
    case 'command':
      return <CommandHistory commandId={component.key as CommandId} />;
    case 'standard':
      return <StandardHistory standardId={component.key as StandardId} />;
    case 'skill':
      return <SkillHistory skillId={component.key as SkillId} />;
  }
}

function CommandHistory({ commandId }: Readonly<{ commandId: CommandId }>) {
  const { data, isLoading, isError } = useGetCommandVersionsQuery(commandId);

  return (
    <HistoryBody
      entries={historyEntries(data)}
      isLoading={isLoading}
      isError={isError}
    />
  );
}

function StandardHistory({ standardId }: Readonly<{ standardId: StandardId }>) {
  const { data, isLoading, isError } = useGetStandardVersionsQuery(standardId);

  return (
    <HistoryBody
      entries={historyEntries(data)}
      isLoading={isLoading}
      isError={isError}
    />
  );
}

function SkillHistory({ skillId }: Readonly<{ skillId: SkillId }>) {
  const { data, isLoading, isError } = useGetSkillVersionsQuery(skillId);

  return (
    <HistoryBody
      entries={historyEntries(data)}
      isLoading={isLoading}
      isError={isError}
    />
  );
}

/**
 * The rows, or the reason there are none.
 *
 * A component that exists was created once, so one row is the floor rather than
 * a state to apologise for. The line above it says so in words, because a list
 * of one on a tab called History reads as a list that failed to load.
 */
function HistoryBody({
  entries,
  isLoading,
  isError,
}: Readonly<{
  entries: readonly HistoryEntry[];
  isLoading: boolean;
  isError: boolean;
}>) {
  /*
   * Asked for once here rather than per row. A version carries the id of who
   * cut it and nothing else, and the names live with the organisation's
   * members: one org-wide query, cached, answers every row.
   *
   * Its failure is not this tab's failure. A history with no names is still a
   * history, so nothing below waits on it or reports it.
   */
  const { data: organizationUsers } = useGetUsersInMyOrganizationQuery();
  const displayNames = displayNamesById(organizationUsers?.users);

  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" paddingY={10}>
        <PMSpinner />
      </PMBox>
    );
  }

  if (isError) {
    return <PMText color="error">Error loading this history.</PMText>;
  }

  if (entries.length === 0) {
    return (
      <PMText as="div" fontSize="sm" color="secondary">
        No version recorded.
      </PMText>
    );
  }

  return (
    <PMVStack gap={4} align="stretch" maxWidth="72ch">
      {entries.length === 1 && (
        <PMText as="div" fontSize="sm" color="secondary">
          One version. Nothing has changed since this component was created.
        </PMText>
      )}
      <PMVStack gap={0} align="stretch">
        {entries.map((entry) => (
          <HistoryRow
            key={entry.key}
            entry={entry}
            author={historyAuthor(entry, displayNames)}
          />
        ))}
      </PMVStack>
    </PMVStack>
  );
}

/**
 * One version: its number, what it came out of, and when.
 *
 * The date and the author sit together on the right, stacked, the way the
 * `Distributed At` column of the distribution table stacks them. The subject
 * wraps rather than truncating: it is prose, the list is 72ch wide, and a row
 * growing by a line costs nothing in a column that already scrolls.
 *
 * Separated by a rule rather than boxed. A version is not a card, and eight
 * bordered boxes down a pane is a table with extra steps.
 */
function HistoryRow({
  entry,
  author,
}: Readonly<{ entry: HistoryEntry; author: string | null }>) {
  return (
    <PMHStack
      align="start"
      gap={4}
      paddingY={3}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      _first={{ borderTopWidth: 0, paddingTop: 0 }}
    >
      <PMText
        fontSize="sm"
        color="secondary"
        fontVariantNumeric="tabular-nums"
        flexShrink={0}
        minWidth="3.5ch"
      >
        v{entry.version}
      </PMText>

      <PMVStack flex="1" minW={0} gap={1} align="stretch">
        {/*
          No commit on a version that was not cut by one, which is every
          version of every skill: `SkillVersion` has no such field. Nothing
          takes its place, because the only other thing the version carries is
          a user id, and that says who rather than from where.
        */}
        {entry.commit && <CommitSubject commit={entry.commit} />}
        {entry.renamedFrom && (
          <PMText as="div" fontSize="xs" color="secondary">
            {`renamed from "${entry.renamedFrom}"`}
          </PMText>
        )}
      </PMVStack>

      <PMVStack gap={0} align="end" flexShrink={0}>
        {entry.createdAt && (
          <PMText fontSize="xs" color="faded" whiteSpace="nowrap">
            {formatRelativeDate(entry.createdAt)}
          </PMText>
        )}
        {author && (
          <PMText fontSize="xs" color="faded" whiteSpace="nowrap">
            {author}
          </PMText>
        )}
      </PMVStack>
    </PMHStack>
  );
}

/**
 * The commit a version came out of: its sha, its subject, and a way to it.
 *
 * A link only when the payload carries a url. A sha with nowhere to go is still
 * worth printing, and dressing it as a link that does nothing is worse than
 * printing it plain.
 */
function CommitSubject({ commit }: Readonly<{ commit: HistoryCommit }>) {
  const line = (
    <PMHStack gap={2} align="baseline" minW={0}>
      <PMText
        fontSize="xs"
        fontFamily="mono"
        color="faded"
        flexShrink={0}
        whiteSpace="nowrap"
      >
        {commit.shortSha}
      </PMText>
      <PMText as="div" fontSize="sm">
        {commit.subject}
      </PMText>
      {commit.url && (
        <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
          <LuExternalLink />
        </PMIcon>
      )}
    </PMHStack>
  );

  if (!commit.url) return line;

  return (
    <PMBox
      _hover={{ color: 'branding.primary' }}
      transition="color 150ms ease-out"
      asChild
    >
      <a href={commit.url} target="_blank" rel="noreferrer">
        {line}
      </a>
    </PMBox>
  );
}

/**
 * A command is what it declares and what it says to do, read in that order, the
 * same as a skill. Unlike a skill, it carries both in one string: nothing on the
 * command splits the frontmatter off, so the split happens here.
 *
 * It has to happen somewhere. A closing `---` under a `description:` line is a
 * setext heading, so a command handed to the Markdown viewer whole came out with
 * its frontmatter as the largest title on the page.
 *
 * Fetched by id rather than read from the space catalogue the pane already
 * holds: this is the same query the command's own page runs, so opening one
 * from here and opening it there share a cache entry and cannot disagree about
 * what the content is.
 */
function CommandBody({ commandId }: Readonly<{ commandId: CommandId }>) {
  const {
    data: command,
    isLoading,
    isError,
  } = useGetCommandByIdQuery(commandId);

  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" paddingY={10}>
        <PMSpinner />
      </PMBox>
    );
  }

  if (isError || !command) {
    return <PMText color="error">Error loading this command.</PMText>;
  }

  if (!command.content) {
    return (
      <PMText color="secondary">
        This command has no instructions yet. An empty command tells a coding
        agent nothing, and it is distributed all the same.
      </PMText>
    );
  }

  const frontmatter = parseCommandFrontmatter(command.content);

  return (
    <PMVStack gap={6} align="stretch" maxWidth="72ch">
      <CommandFrontmatterInfo frontmatter={frontmatter} />

      {frontmatter.body ? (
        <PMBox>
          <PMMarkdownViewer content={frontmatter.body} />
        </PMBox>
      ) : (
        <PMText color="secondary">
          This command declares itself and stops there. Its frontmatter tells a
          coding agent when to reach for it, and nothing tells it what to do
          once it has.
        </PMText>
      )}
    </PMVStack>
  );
}

/**
 * A standard is prose plus the rules it breaks down into. Both, because either
 * one alone misreads it: the prose without the rules is an intention nobody
 * checks, and the rules without the prose are a checklist with no reason.
 *
 * The scope leads, when the standard has one. It is not in the prototype's
 * standard body, but it is the line that says where the standard applies, and
 * the pane is on its way to being the only place a standard is read.
 */
/**
 * A standard as the markdown a coding agent reads, on the clipboard.
 *
 * Both queries are the ones the body below runs, with the same keys, so this
 * asks for nothing: React Query answers it from the requests already in
 * flight. Nothing renders until the standard is there, a copy control being a
 * promise about content and not a placeholder.
 */
function CopyStandardMarkdown({
  standardId,
  name,
}: Readonly<{
  standardId: StandardId;
  /** Off the frame, which is showing it, rather than out of the query again. */
  name: string;
}>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const { data } = useGetStandardByIdQuery(standardId);
  const { data: rules } = useGetRulesByStandardIdQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standardId,
  );

  const standard = data?.standard ?? null;

  if (!standard) return null;

  return (
    <CopyMarkdownButton
      markdown={serializeStandardToMarkdown({
        name,
        scope: standard.scope ?? '',
        description: standard.description,
        rules: rules ?? [],
      })}
    />
  );
}

function StandardBody({
  standardId,
  ruleHref,
}: Readonly<{
  standardId: StandardId;
  /** Where one rule is configured, built per rule by the caller. */
  ruleHref: (ruleId: Rule['id']) => string;
}>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const { data, isLoading, isError } = useGetStandardByIdQuery(standardId);
  // The endpoint answers with an envelope, and null inside it for a standard
  // that is gone. Both cases land in the same branch below.
  const standard = data?.standard ?? null;

  /*
   * The rules are a query of their own, as they are on the standard's page: the
   * standard carries its prose, never its rules. The casts follow that page,
   * where the query is disabled until both ids exist.
   */
  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useGetRulesByStandardIdQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standardId,
  );

  const sortedRules = useMemo(
    () => (rules ? sortRulesByContent(rules) : []),
    [rules],
  );

  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" paddingY={10}>
        <PMSpinner />
      </PMBox>
    );
  }

  if (isError || !standard) {
    return <PMText color="error">Error loading this standard.</PMText>;
  }

  return (
    <PMVStack gap={6} align="stretch" maxWidth="72ch">
      {standard.scope && (
        <PMBox>
          <BodySectionLabel>Scope</BodySectionLabel>
          <PMText as="div" fontSize="sm" fontFamily="mono" paddingTop={1}>
            {standard.scope}
          </PMText>
        </PMBox>
      )}

      {standard.description && (
        <PMBox>
          <PMMarkdownViewer content={standard.description} />
        </PMBox>
      )}

      <PMBox>
        {/*
          The heading alone on its line again. It shared it with a link to the
          standard's rules page, which was the way out this surface kept when
          the header's "Open standard" went: the code examples and the linter
          program are not in the pane and someone has to be able to reach them.

          The rows are what carry it now, one door each. The list it led to was
          the same rules a second time, with a name, a linter status and a
          severity the pane prints itself, so as a stop on the way it cost a
          click and answered nothing. A rule is what gets configured, and the
          row for it is where the link belongs.

          The count only when there is one to give: loading, failed and empty
          all read better as the plain heading, and "0 rules" above a line that
          already says there is no rule was saying it twice.
        */}
        <BodySectionLabel>
          {sortedRules.length > 0
            ? `${sortedRules.length} rule${sortedRules.length === 1 ? '' : 's'}`
            : 'Rules'}
        </BodySectionLabel>
        <PMBox paddingTop={1}>
          <RulesSection
            rules={sortedRules}
            standardId={standardId}
            ruleHref={ruleHref}
            isLoading={rulesLoading}
            isError={rulesError}
          />
        </PMBox>
      </PMBox>
    </PMVStack>
  );
}

/**
 * The rules of a standard, as a list rather than the table its page uses.
 *
 * The table is not reusable here: it carries a linter status column of its own
 * and builds its links from the route parameters of the standard's page, which
 * the pane does not have. A row is not a link for the same reason the prototype
 * does not make it one.
 *
 * What a row does carry now is whether the rule is detected automatically. A
 * rule nothing can check is a sentence in a document, and a rule with an active
 * detection program behind it is enforced. That difference decides how much of
 * the standard the reader should expect to be held to, and until now finding it
 * out was a page per rule.
 */
function RulesSection({
  rules,
  standardId,
  ruleHref,
  isLoading,
  isError,
}: Readonly<{
  rules: readonly Rule[];
  standardId: StandardId;
  ruleHref: (ruleId: Rule['id']) => string;
  isLoading: boolean;
  isError: boolean;
}>) {
  /*
   * One request for the whole standard rather than one per rule, and the same
   * key the standard's own page reads, so opening a standard here and opening
   * it there costs the linter one answer between them.
   *
   * The data only. A failure leaves every row as plain content, which is the
   * rendering the OSS edition gets anyway, and announcing above a list of rules
   * that the linter could not be reached answers a question the reader has not
   * asked yet.
   */
  const { data: detectionStatuses } =
    useGetStandardRulesDetectionStatusQuery(standardId);

  const detections = useMemo(
    () => ruleDetectionsById(detectionStatuses),
    [detectionStatuses],
  );

  /*
   * A set rather than one open row at a time. Two rules of the same standard
   * being active in different languages is exactly the comparison this is for,
   * and a list that closes what you were reading to show you what you clicked
   * makes that comparison impossible.
   */
  const [openRuleIds, setOpenRuleIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const toggleRule = (ruleId: string) => {
    setOpenRuleIds((open) => {
      const next = new Set(open);

      if (!next.delete(ruleId)) {
        next.add(ruleId);
      }

      return next;
    });
  };

  if (isLoading) {
    return (
      <PMText fontSize="sm" color="faded">
        Loading rules…
      </PMText>
    );
  }

  if (isError) {
    return <PMText color="error">Failed to load the rules.</PMText>;
  }

  if (rules.length === 0) {
    return (
      <PMText as="div" fontSize="sm" color="secondary">
        No rule yet. The prose still reaches the coding agent, but nothing in
        this standard can be checked against a change.
      </PMText>
    );
  }

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
    >
      {rules.map((rule, index) => (
        <RuleRow
          key={rule.id}
          rule={rule}
          standardId={standardId}
          configureHref={ruleHref(rule.id)}
          /*
            The absence of an answer is an answer in the edition that has a
            linter: nothing has been written to check this rule. It was silence
            until now, which read as a rendering gap next to a standard whose
            every row carries a state, and left `Configure` beside a row with
            no reason on it.
          */
          detection={
            detections.get(rule.id) ??
            (hasRuleDetection() ? UNDETECTED_RULE : null)
          }
          isFirst={index === 0}
          isOpen={openRuleIds.has(rule.id)}
          onToggle={() => toggleRule(rule.id)}
        />
      ))}
    </PMBox>
  );
}

/**
 * One rule, and its detection status when the edition has one to give.
 *
 * The prose is not the trigger. It is the thing being read, sometimes a full
 * sentence worth copying into a review comment, and a paragraph inside a button
 * cannot be selected with the mouse. So the status and the chevron are the
 * trigger, together: one target, on the side of the row where the status
 * already sits, leaving the sentence to be a sentence.
 *
 * The status is one element in all cases, a button only when there is something
 * to open, and it keeps the chevron's width either way. A row whose label says
 * everything there is loses the chevron, and the ten labels above and below it
 * have to stay in the same column: an alignment that moves by sixteen pixels
 * from row to row is read as a mistake long before it is read as a meaning.
 *
 * With no detection status at all the row keeps its way out and loses the rest.
 * That is the OSS rendering, and also a proprietary rule the linter has never
 * been pointed at, which is the row most worth opening: the way out is what
 * makes it detectable at all, so it cannot be the one thing the row hides.
 */
function RuleRow({
  rule,
  standardId,
  configureHref,
  detection,
  isFirst,
  isOpen,
  onToggle,
}: Readonly<{
  rule: Rule;
  /** Only for the severity, which is set on a program of this standard. */
  standardId: StandardId;
  /** The rule's own page, where its examples and its program are. */
  configureHref: string;
  detection: RuleDetection | null;
  isFirst: boolean;
  isOpen: boolean;
  onToggle: () => void;
}>) {
  const detailId = `rule-detection-${rule.id}`;
  const opens = detection ? ruleDetectionOpens(detection) : false;

  return (
    <PMBox
      paddingX={3}
      paddingY="10px"
      borderTopWidth={isFirst ? '0' : '1px'}
      borderColor="border.tertiary"
    >
      <PMHStack gap={3} align="start" justify="space-between">
        {/*
          Growing and allowed to shrink to nothing, so a long rule wraps inside
          its own width instead of pushing the status off the row. The pane is
          narrow and the rules are prose: this is the column that has to give.
        */}
        <PMText fontSize="sm" flex="1" minWidth={0}>
          {rule.content}
        </PMText>

        {detection && (
          <PMBox
            as={opens ? 'button' : 'div'}
            aria-expanded={opens ? isOpen : undefined}
            aria-controls={opens ? detailId : undefined}
            onClick={opens ? onToggle : undefined}
            cursor={opens ? 'pointer' : undefined}
            display="flex"
            alignItems="center"
            gap={1.5}
            flexShrink={0}
            paddingX={1.5}
            paddingY={0.5}
            marginY="-2px"
            borderRadius="sm"
            _hover={
              opens ? { backgroundColor: 'background.secondary' } : undefined
            }
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'branding.primary',
              outlineOffset: '1px',
            }}
          >
            <RuleDetectionMark state={detection.state} />
            <PMText fontSize="xs" color="secondary" whiteSpace="nowrap">
              {ruleDetectionLabel(detection, getLanguageDisplayName)}
            </PMText>
            {/*
              Kept in the layout when it has nothing to do, so the labels of
              every row in the list end at the same place.
            */}
            <PMIcon
              as="span"
              display="inline-flex"
              fontSize="sm"
              color="text.faded"
              visibility={opens ? undefined : 'hidden'}
              transform={isOpen ? 'rotate(180deg)' : undefined}
              transition="transform 120ms ease"
            >
              <LuChevronDown />
            </PMIcon>
          </PMBox>
        )}

        {/*
          One word, on every row, in its own column at the right edge. The
          heading above the list carried this for the whole standard and landed
          on a list of the same rules; a rule is the thing that has examples and
          a program, so the row is the honest place for the door and the list in
          between stops being a step.

          Faded, and at the size the heading's link was rather than the row's.
          Thirty of these in a column is the loudest a list of prose can get if
          they are allowed to be, and what they lead to is work nobody does
          while reading.

          Its own column, and always in it, so the labels of the chips to its
          left end at one x down the whole list. That alignment is why the
          chevron beside them is kept in the layout when it has nothing to do,
          and a link that came and went by row would undo it.
        */}
        <PMBox
          fontSize="11px"
          color="text.faded"
          flexShrink={0}
          paddingTop="3px"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          asChild
        >
          <Link to={configureHref}>Configure</Link>
        </PMBox>
      </PMHStack>

      {detection && opens && isOpen && (
        <PMHStack id={detailId} gap={3} align="start" paddingTop={2.5}>
          <PMText fontSize="xs" color="faded" flexShrink={0} minWidth="72px">
            Languages
          </PMText>
          <RuleDetectionLanguages
            standardId={standardId}
            ruleId={rule.id}
            detection={detection}
          />
        </PMHStack>
      )}
    </PMBox>
  );
}

/**
 * A skill is a folder: what it declares, what it says to do, and the files that
 * ship beside it. Read in that order, which is the order an agent reads them
 * in — the frontmatter is what decides whether the instructions are opened at
 * all.
 *
 * The frontmatter is the skill page's own component rather than a second
 * rendering of it. `metadata` and `additionalProperties` are open-ended, and a
 * skill declaring something this pane had never heard of would be the kind of
 * disagreement nobody notices until the agent behaves differently from what the
 * page showed.
 */
/**
 * A skill's instructions, and the one control that changes them.
 *
 * The pencil is here rather than in the header, unlike the `Edit` a standard
 * and a command carry. Theirs leaves for a form and comes back; this one swaps
 * the prose for an editor in place, which is what the skill's own page does
 * too, and a trigger that far from what it changes would have to hand state
 * back down through a frame that serves three types.
 *
 * Editable at all only since the plugin-first navigation stopped serving the
 * page that used to carry this. See `ContextSkillFileDetail` for the other half
 * and `useCanEditSkillFiles` for the rule both ask.
 */
function SkillBody({ skillId }: Readonly<{ skillId: SkillId }>) {
  const { data, isLoading, isError } = useGetSkillWithFilesByIdQuery(skillId);
  const canEdit = useCanEditSkillFiles(data?.skill);
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" paddingY={10}>
        <PMSpinner />
      </PMBox>
    );
  }

  /*
   * Null rather than an error for a skill that is gone, the same as the other
   * two bodies: the row it was opened from came from a list that had it, so by
   * the time this fails there is nothing useful to say beyond that it failed.
   */
  if (isError || !data) {
    return <PMText color="error">Error loading this skill.</PMText>;
  }

  const { latestVersion } = data;

  if (isEditing) {
    return (
      /*
        No 72ch cap while editing, unlike the read view above. That measure is
        for reading prose; an editor is a working surface, and capped it gave
        four hundred pixels of writing room inside a twelve hundred pixel pane.
        The same reason a file is shown full width here.
      */
      <PMVStack gap={6} align="stretch">
        <SkillFrontmatterInfo skillVersion={latestVersion} />
        {/*
          The body alone, which is what `prompt` holds. The frontmatter above is
          parsed into columns of the version and is not edited as text here, so
          handing the editor the reassembled file would invite a change this
          save cannot keep.
        */}
        <SkillFileEditor
          skillId={skillId}
          skillSlug={data.skill.slug}
          filePath={SKILL_MD_FILENAME}
          initialContent={latestVersion.prompt}
          currentVersion={latestVersion.version}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="stretch" maxWidth="72ch">
      <SkillFrontmatterInfo skillVersion={latestVersion} />

      {/*
        The pencil is in the prose's own top-right corner, which is where the
        same pencil sits on a file. It began on a line of its own above, and on
        screen that line read as belonging to nothing: the stack's gap above it
        and the first heading's own margin below it are close enough in size
        that it centred itself between the frontmatter and the text. Inside the
        block it edits, it cannot do that, and it costs no vertical space,
        sitting in the margin the heading already leaves.

        Outside the branch below, because a skill with no instructions is the
        one that most needs the way to write some.
      */}
      <PMBox position="relative">
        {canEdit && (
          <PMBox position="absolute" top={0} right={0} zIndex={1}>
            <PMIconButton
              aria-label="Edit instructions"
              size="sm"
              variant="tertiary"
              onClick={() => setIsEditing(true)}
            >
              <LuPencil />
            </PMIconButton>
          </PMBox>
        )}
        {latestVersion.prompt ? (
          <PMMarkdownViewer content={latestVersion.prompt} />
        ) : (
          <PMText color="secondary">
            This skill has no instructions yet. Its frontmatter tells a coding
            agent when to reach for it, and nothing tells it what to do once it
            has.
          </PMText>
        )}
      </PMBox>

      {/*
        No list of files here. The surface reads the same query and turns the
        rail into this skill's file tree whenever there is one, so a list in the
        body would be the same folder printed twice, and the copy without links
        would be the one people clicked at.
      */}
    </PMVStack>
  );
}
