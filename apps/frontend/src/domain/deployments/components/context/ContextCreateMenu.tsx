import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMHeading,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMVStack,
  type PMButtonVariants,
} from '@packmind/ui';
import {
  LuBot,
  LuChevronDown,
  LuChevronRight,
  LuLibrary,
  LuPencilLine,
  LuPlus,
  LuUpload,
} from 'react-icons/lu';
import type { ArtifactType, PackageId } from '@packmind/types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { CreateFromCodeContent } from '../../../../shared/components/cli/CreateFromCodeContent';
import { ARTIFACT_CREATION_ROUTES } from '../../../../shared/creation/artifactCreationRoutes';
import {
  buildCreationMethods,
  listTypeLabels,
} from '../../../../shared/creation/buildCreationMethods';
import { StandardSamplesModal } from '../../../standards/components/StandardSamplesModal';
import { useSamplesIntoPackage } from '../../../standards/components/useSamplesIntoPackage';
import { SkillsImportContent } from '../../../skills/components/SkillsImportContent';
import { withPackageParam } from '../../hooks/useCreateIntoPackage';
import {
  COMPONENT_TYPE_LABELS,
  COMPONENT_TYPE_LABELS_SINGULAR,
  COMPONENT_TYPE_ORDER,
} from './buildPackageContext';

/**
 * Every way of adding something to a package, indexed by who writes it.
 *
 * It used to be indexed by type: three headings, seven entries, one group per
 * kind of artifact. That was the wrong axis twice over. Three of the seven
 * entries were the same instruction sheet, said three times, because "ask your
 * agent" does not vary by type; and the reader was made to choose a type before
 * choosing a method, when for the agent route the type is not chosen here at
 * all, it is chosen in the terminal, in the slash command.
 *
 * It was also the shape PRODUCT.md warns against in as many words: "The
 * playbook is one library, not three products. Resist designing each as its own
 * product area." Three group headings in a create menu is that resistance
 * failing.
 *
 * On this axis the menu stops growing with the type count. Four methods, and
 * three of them absorb a new artifact type without gaining an entry: the agent
 * gains a slash command inside its dialog, the import gains a word in its
 * description. Only the manual branch grows, which is why it folds. What the
 * entries cover is read from the registry, so this file states no type list of
 * its own and cannot drift from what exists.
 */
/**
 * What every one of these four methods produces, said once. The trigger states
 * it when it has room for words, and the menu states it when the trigger is a
 * chevron: the same phrase either way, so the shape the control takes never
 * changes what it is called.
 */
const CREATE_LABEL = 'Create a component';

export function ContextCreateMenu({
  orgSlug,
  spaceSlug,
  packageId,
  variant = 'primary',
  trigger = 'standalone',
}: Readonly<{
  orgSlug: string;
  spaceSlug: string;
  packageId: PackageId;
  /**
   * How loud the trigger is, decided by the caller: whether creating is the
   * thing to do next depends on what the package already holds, which the menu
   * has no way of knowing.
   */
  variant?: PMButtonVariants;
  /**
   * How the control presents itself, the same two shapes the distribute control
   * takes in this header.
   *
   * `standalone` is the button on its own: the plus, the label, the chevron.
   *
   * `split` is the right half of a split button whose wide half adds what the
   * space already owns. It draws the chevron alone and squares the joined edge,
   * and the word it gives up moves inside as the menu's own heading, so what
   * the chevron holds is still named somewhere the reader can find it.
   */
  trigger?: 'standalone' | 'split';
}>) {
  const methods = buildCreationMethods(
    ARTIFACT_CREATION_ROUTES,
    COMPONENT_TYPE_ORDER,
  );

  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isSamplesModalOpen, setIsSamplesModalOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const analytics = useAnalytics();
  const putSamplesInPackage = useSamplesIntoPackage(packageId);

  const plural = (types: readonly ArtifactType[]) =>
    listTypeLabels(
      types.map((type) => COMPONENT_TYPE_LABELS[type]),
    ).toLowerCase();

  /*
   * The four methods, built once and placed either inside a labelled group or
   * straight into the menu. Two copies of this list would have been two lists.
   */
  const entries = (
    <>
      {methods.agent && (
        <MethodItem
          value="from-agent"
          icon={<LuBot />}
          /*
           * The one accented entry, and the reason the accent means
           * something again. Every group used to carry its own bot in
           * branding.primary, so the colour marked a repeated item
           * rather than a recommended path, and two unrelated yellows
           * sat beside it.
           */
          iconColor="branding.primary"
          title="With your coding agent"
          description={`Reads your repository and writes ${plural(methods.agent.types)}`}
          onClick={() => setIsAgentDialogOpen(true)}
        />
      )}

      {methods.samples && (
        <MethodItem
          value="from-samples"
          icon={<LuLibrary />}
          title="From samples"
          description={`Proven ${plural(methods.samples.types)} for common stacks, added to this package`}
          onClick={() => {
            analytics.track('create_standard_from_samples_clicked', {});
            setIsSamplesModalOpen(true);
          }}
        />
      )}

      {methods.form?.layout === 'flat' &&
        methods.form.types.map((type) => (
          <MethodItem
            key={type}
            value={`write-${type}`}
            icon={<LuPencilLine />}
            title={`Write a ${COMPONENT_TYPE_LABELS_SINGULAR[type].toLowerCase()}`}
            description="Blank form, added to this package"
            to={formRoute(type, orgSlug, spaceSlug, packageId)}
          />
        ))}

      {/*
          The same branch, folded, once its types are a list rather than a
          pair. A submenu of types is right here and wrong in the old
          layout for the same reason: a reader who has picked "write it
          yourself" has spent their decision about method, so the type is
          the question they are now asking. Type-first, it was a gate in
          front of the question they had not asked yet.
        */}
      {methods.form?.layout === 'folded' && (
        <PMMenu.Root positioning={{ placement: 'right-start' }}>
          <PMMenu.TriggerItem>
            <MethodBody
              icon={<LuPencilLine />}
              title="Write it yourself"
              description={listTypeLabels(
                methods.form.types.map(
                  (type) => COMPONENT_TYPE_LABELS_SINGULAR[type],
                ),
              )}
              trailing={
                <PMIcon color="text.tertiary" fontSize="sm">
                  <LuChevronRight />
                </PMIcon>
              }
            />
          </PMMenu.TriggerItem>
          <PMPortal>
            <PMMenu.Positioner>
              <PMMenu.Content minW="220px">
                {methods.form.types.map((type) => (
                  <PMMenu.Item
                    key={type}
                    value={`write-${type}`}
                    asChild
                    cursor="pointer"
                    p={3}
                  >
                    <Link to={formRoute(type, orgSlug, spaceSlug, packageId)}>
                      <PMText fontSize="sm">
                        {COMPONENT_TYPE_LABELS_SINGULAR[type]}
                      </PMText>
                    </Link>
                  </PMMenu.Item>
                ))}
              </PMMenu.Content>
            </PMMenu.Positioner>
          </PMPortal>
        </PMMenu.Root>
      )}

      {methods.fileImport && (
        <>
          {/*
              The one separator, and it divides writing from bringing
              something that already exists. Where the separators used to
              divide one type from another, which is the distinction this
              menu no longer makes.
            */}
          <PMMenu.Separator />
          <MethodItem
            value="import"
            icon={<LuUpload />}
            title="Import from your machine"
            description={`A folder of ${plural(methods.fileImport.types)}, or import them with the CLI`}
            onClick={() => setIsImportDialogOpen(true)}
          />
        </>
      )}
    </>
  );

  return (
    <>
      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          {trigger === 'split' ? (
            <PMButton
              size="sm"
              variant={variant}
              aria-label={CREATE_LABEL}
              paddingInline={2}
              borderStartRadius={0}
            >
              <LuChevronDown aria-hidden />
            </PMButton>
          ) : (
            /*
             * Named rather than left at "Create", which is what the three
             * per-type pages call their own button. Up here it sat beside a
             * second control that also filled this package, and a bare verb
             * next to "Add components" made the reader guess which of the two
             * was theirs. Saying the object costs four words and settles it.
             */
            <PMButton size="sm" variant={variant}>
              <PMIcon fontSize="xs">
                <LuPlus />
              </PMIcon>
              {CREATE_LABEL}
              <LuChevronDown aria-hidden />
            </PMButton>
          )}
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            {/*
              The clamp stays, as a floor rather than as working scroll. Seven
              explained items came to about 620px and hung off a laptop
              viewport, which is what the clamp was added for. Four fit, and the
              fold keeps them four however many types the product grows.
            */}
            {/*
              Bounded on both axes, which the height alone was not. With only a
              minimum, the agent entry's description set the width: one 73
              character line pushed the menu to 513px, and every artifact type
              added later would have lengthened that same line. A menu that
              stops growing downward by naming its types in a description only
              keeps that promise if the description is allowed to wrap.
            */}
            <PMMenu.Content
              minW="350px"
              maxW="400px"
              maxH="calc(100vh - 10rem)"
            >
              {/*
                A labelled group only in the split shape, where the trigger is a
                chevron with no word on it: the heading is where the word the
                shape gave up ends up, and the group is what ties it to the four
                entries it names. Standalone, the button already says this, and a
                heading repeating the label it was opened from is a line of the
                menu spent saying nothing.
              */}
              {trigger === 'split' ? (
                <PMMenu.ItemGroup>
                  {/*
                    The product's own group label, the one the space overview
                    and the sidebar's sections use: uppercase, tracked, and a
                    step quieter than the entries. Left at plain sentence case
                    it landed on 13px medium in the same colour as every
                    description under it, which made it a fifth line of content
                    competing with the first entry's title rather than a name
                    for the four.
                  */}
                  <PMMenu.ItemGroupLabel
                    paddingInline={3}
                    paddingTop={2}
                    paddingBottom={1}
                    fontSize="xs"
                    fontWeight="medium"
                    textTransform="uppercase"
                    letterSpacing="0.08em"
                    color="text.faded"
                  >
                    {CREATE_LABEL}
                  </PMMenu.ItemGroupLabel>
                  {entries}
                </PMMenu.ItemGroup>
              ) : (
                entries
              )}
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>

      {/* Outside the menu: the content unmounts when it closes. */}
      <MethodDialog
        title="How to create with your coding agent"
        isOpen={isAgentDialogOpen}
        onClose={() => setIsAgentDialogOpen(false)}
      >
        <CreateFromCodeContent artifactType="all" />
      </MethodDialog>

      <MethodDialog
        title="How to import"
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      >
        <SkillsImportContent />
      </MethodDialog>

      <StandardSamplesModal
        open={isSamplesModalOpen}
        onOpenChange={setIsSamplesModalOpen}
        onCreated={putSamplesInPackage}
      />
    </>
  );
}

/**
 * Where a type's blank form lives, with the package it should join.
 *
 * The registry answers the first half and the caller the second: the form is the
 * one creation path that finishes knowing the id of what it made, so what it
 * writes can join the package in the same gesture.
 */
function formRoute(
  type: ArtifactType,
  orgSlug: string,
  spaceSlug: string,
  packageId: PackageId,
): string {
  const route = ARTIFACT_CREATION_ROUTES[type].formRoute;
  if (!route) throw new Error(`No form route for ${type}`);

  return withPackageParam(route(orgSlug, spaceSlug), packageId);
}

/**
 * One entry's insides, so a menu item and a submenu trigger read identically.
 * The three per-type hooks each carried their own copy of this stack, which is
 * how their icon sizes and their description colours drifted apart.
 */
function MethodBody({
  icon,
  iconColor = 'text.tertiary',
  title,
  description,
  trailing,
}: Readonly<{
  icon: ReactNode;
  iconColor?: string;
  title: string;
  description: string;
  trailing?: ReactNode;
}>) {
  return (
    <PMHStack width="full" justify="space-between" gap={3}>
      <PMVStack alignItems="flex-start" gap={0}>
        <PMHStack gap={2} mb={1}>
          <PMIcon color={iconColor} size="lg">
            {icon}
          </PMIcon>
          <PMText fontWeight="semibold" fontSize="sm">
            {title}
          </PMText>
        </PMHStack>
        {/*
          Tertiary, not secondary. Secondary is beige-100, which lands at
          rgb(233,227,221) against a white title: a 22-point step that reads as
          one weight of text rather than as a title and its gloss. Every entry
          here carries a description, so that step is doing the work of telling
          the reader what to scan and what to read. Tertiary is the ramp's
          documented place for supporting text, matches the icon beside it, and
          clears AA against this surface by a wide margin.
        */}
        <PMText fontSize="xs" color="tertiary">
          {description}
        </PMText>
      </PMVStack>
      {trailing}
    </PMHStack>
  );
}

/**
 * An entry that either navigates or opens something, drawn the same way either
 * way: which of the two it is, is an implementation detail of the method and not
 * something the reader should be able to feel in the list.
 */
function MethodItem({
  value,
  icon,
  iconColor,
  title,
  description,
  onClick,
  to,
}: Readonly<{
  value: string;
  icon: ReactNode;
  iconColor?: string;
  title: string;
  description: string;
  onClick?: () => void;
  to?: string;
}>) {
  const body = (
    <MethodBody
      icon={icon}
      iconColor={iconColor}
      title={title}
      description={description}
    />
  );

  if (to) {
    return (
      <PMMenu.Item value={value} p={3} asChild cursor="pointer">
        <Link to={to}>{body}</Link>
      </PMMenu.Item>
    );
  }

  return (
    <PMMenu.Item value={value} p={3} onClick={onClick} cursor="pointer">
      {body}
    </PMMenu.Item>
  );
}

/**
 * The shell the explaining paths open. Three of them existed, identical but for
 * their title, one per type.
 */
function MethodDialog({
  title,
  isOpen,
  onClose,
  children,
}: Readonly<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}>) {
  return (
    <PMDialog.Root
      open={isOpen}
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior="inside"
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title asChild>
                <PMHeading level="h3">{title}</PMHeading>
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>{children}</PMDialog.Body>
            <PMDialog.Footer>
              <PMButton variant="tertiary" size="md" onClick={onClose}>
                Close
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
}
