import React, { useState } from 'react';
import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHeading,
  PMMenu,
  PMPortal,
  PMTabsCompound,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import { RunDistribution } from '../RunDistribution/RunDistribution';
import { Package } from '@packmind/types';
import { createPackagesDeploymentNotifications } from '../../utils/deploymentNotificationUtils';
import { PackageInstallSnippets } from '../PackageInstallSnippets';

export interface DeployPackageButtonProps {
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'tertiary';
  selectedPackages: Package[];
  /**
   * The coordinates of the single package this button is about, when the
   * control should also offer the channel Packmind does not perform itself: a
   * developer running `packmind install` in their own repository.
   *
   * Optional because it only makes sense for one package. The batch call sites
   * distribute a selection, and there is no one command for a selection.
   *
   * Slugs rather than the package, because the command names the space too and
   * `Package` does not carry the space's slug.
   */
  cliInstall?: { spaceSlug: string; packageSlug: string };
}

const MENU_VALUE_CODE_REPOSITORIES = 'code-repositories' as const;

const PUSH_TAB = 'push' as const;
const CLI_TAB = 'cli' as const;

/**
 * Distribute action surfaced on `PackagesPage` and `PackageDetailPage`.
 *
 * When `cliInstall` is given it grows a second mode: a panel split into two
 * tabs, one per direction the package can travel. Push is Packmind writing
 * somewhere on your behalf, and the CLI is you writing, from a checkout, at a
 * time of your choosing.
 *
 * One control and not two, because the product does not treat those as different
 * kinds of thing: a target reached by the CLI lands in the same distribution
 * state and drifts the same way, and the app already tells users to reach for
 * the CLI where in-app distribution is not configured. Tabs rather than a flat
 * list with a separator, because the two sides do not answer the same shape of
 * question. Push is a choice between destinations, so it is a list; the CLI is a
 * command to carry away, so it is content, and a list item that opens a second
 * layer to show two fields makes the reader pay a click for a label they had
 * already read.
 *
 * Without `cliInstall` it stays the plain button it has always been. There is no
 * second mode to name, and a chevron over one destination promises a choice
 * that is not there.
 */
export const DeployPackageButton: React.FC<DeployPackageButtonProps> = ({
  label = 'Distribute',
  disabled = false,
  size = 'md',
  variant = 'primary',
  selectedPackages,
  cliInstall,
}) => {
  const [isCodeRepoOpen, setCodeRepoOpen] = useState(false);

  return (
    <>
      {cliInstall ? (
        <PMMenu.Root>
          <PMMenu.Trigger asChild>
            <PMButton size={size} variant={variant} disabled={disabled}>
              {label}
              <LuChevronDown aria-hidden />
            </PMButton>
          </PMMenu.Trigger>
          <PMPortal>
            <PMMenu.Positioner>
              {/*
                The tabbed panel sets its own spacing, so the menu's padding
                comes off: left on, it would inset the tab strip from the panel
                edge and the underline would stop short of it.
              */}
              <PMMenu.Content minW="30rem" padding={0}>
                {/*
                  `unmountOnExit`, and not for the usual reason. The panel that
                  is not showing keeps its DOM by default, and the menu around
                  it collects its items from the DOM: with the CLI tab open,
                  ArrowDown highlighted "To code repositories" behind the panel
                  and Enter distributed to it. A keyboard reader was operating a
                  control they could not see. Taking the hidden panel out leaves
                  the menu with only what is on screen to move through.
                */}
                <PMTabsCompound.Root
                  defaultValue={PUSH_TAB}
                  variant="line"
                  lazyMount
                  unmountOnExit
                >
                  <PMTabsCompound.List paddingX={4} paddingTop={2}>
                    <PMTabsCompound.Trigger value={PUSH_TAB}>
                      Push from Packmind
                    </PMTabsCompound.Trigger>
                    <PMTabsCompound.Trigger value={CLI_TAB}>
                      Install with the CLI
                    </PMTabsCompound.Trigger>
                  </PMTabsCompound.List>
                  {/*
                    Less side padding than the tab beside it: these are menu
                    rows, and the strip of colour a highlighted row draws has to
                    reach nearer the panel edge than a paragraph would.
                  */}
                  <PMTabsCompound.Content value={PUSH_TAB} padding={2}>
                    <PMMenu.Item
                      value={MENU_VALUE_CODE_REPOSITORIES}
                      cursor={'pointer'}
                      onClick={() => setCodeRepoOpen(true)}
                    >
                      To code repositories
                    </PMMenu.Item>
                  </PMTabsCompound.Content>
                  <PMTabsCompound.Content
                    value={CLI_TAB}
                    paddingX={4}
                    paddingY={4}
                  >
                    <PMVStack align="stretch" gap={3}>
                      <PMText color="secondary">
                        Run it in the repository that should read the package.
                      </PMText>
                      <PackageInstallSnippets
                        spaceSlug={cliInstall.spaceSlug}
                        packageSlug={cliInstall.packageSlug}
                      />
                    </PMVStack>
                  </PMTabsCompound.Content>
                </PMTabsCompound.Root>
              </PMMenu.Content>
            </PMMenu.Positioner>
          </PMPortal>
        </PMMenu.Root>
      ) : (
        <PMButton
          size={size}
          variant={variant}
          disabled={disabled}
          onClick={() => setCodeRepoOpen(true)}
        >
          {label}
        </PMButton>
      )}

      <PMDialog.Root
        open={isCodeRepoOpen}
        onOpenChange={(details) => setCodeRepoOpen(details.open)}
        size="md"
        placement="center"
        motionPreset="slide-in-bottom"
        scrollBehavior={'outside'}
      >
        <CodeRepositoryDialogContents
          selectedPackages={selectedPackages}
          onClose={() => setCodeRepoOpen(false)}
        />
      </PMDialog.Root>
    </>
  );
};

const CodeRepositoryDialogContents: React.FC<{
  selectedPackages: Package[];
  onClose: () => void;
}> = ({ selectedPackages, onClose }) => (
  <PMPortal>
    <PMDialog.Backdrop />
    <PMDialog.Positioner>
      <PMDialog.Content>
        <RunDistribution
          selectedCommands={[]}
          selectedStandards={[]}
          selectedPackages={selectedPackages}
          onDistributionComplete={(deploymentResults) => {
            onClose();

            const notifications =
              createPackagesDeploymentNotifications(deploymentResults);

            notifications.forEach((notification) => {
              pmToaster.create({
                type: notification.type,
                title: notification.title,
                description: notification.description,
              });
            });
          }}
        >
          <PMDialog.Header>
            <PMDialog.Title asChild>
              <PMHeading level="h2">Distribute to targets</PMHeading>
            </PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <RunDistribution.Body />
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButton variant="tertiary" size="sm" onClick={onClose}>
              Cancel
            </PMButton>
            <RunDistribution.Cta />
          </PMDialog.Footer>
        </RunDistribution>
      </PMDialog.Content>
    </PMDialog.Positioner>
  </PMPortal>
);
