import React, { useState } from 'react';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  MARKETPLACES_FEATURE_KEY,
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHeading,
  PMMenu,
  PMPortal,
  isFeatureFlagEnabled,
  pmToaster,
} from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import { RunDistribution } from '../RunDistribution/RunDistribution';
import { RunMarketplacePublish } from '../RunMarketplacePublish/RunMarketplacePublish';
import { Package } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { createPackagesDeploymentNotifications } from '../../utils/deploymentNotificationUtils';

export interface DeployPackageButtonProps {
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'tertiary';
  selectedPackages: Package[];
}

const MENU_VALUE_CODE_REPOSITORIES = 'code-repositories' as const;
const MENU_VALUE_MARKETPLACES = 'marketplaces' as const;

/**
 * Distribute action surfaced on `PackagesPage` and `PackageDetailPage`.
 *
 * Originally a single button opening the "Distribute to targets" modal; now a
 * `PMMenu` exposing two channels:
 *   - "To code repositories" — keeps the existing `RunDistribution` modal,
 *     no behavior change.
 *   - "To marketplaces" — opens the new `RunMarketplacePublish` modal.
 *
 * The "To marketplaces" entry is gated behind the existing marketplace
 * feature flag (`MARKETPLACES_FEATURE_KEY`) so non-internal users keep
 * seeing the historic single-channel UX.
 */
export const DeployPackageButton: React.FC<DeployPackageButtonProps> = ({
  label = 'Distribute',
  disabled = false,
  size = 'md',
  variant = 'primary',
  selectedPackages,
}) => {
  const { user } = useAuthContext();
  const canSeeMarketplaces = isFeatureFlagEnabled({
    featureKeys: [MARKETPLACES_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: user?.email,
  });

  const [isCodeRepoOpen, setCodeRepoOpen] = useState(false);
  const [isMarketplaceOpen, setMarketplaceOpen] = useState(false);

  // When the marketplace flag is off there is only one channel — keep the
  // historical UX (single button opening the targets modal) so non-internal
  // users see no visual regression.
  if (!canSeeMarketplaces) {
    return (
      <PMDialog.Root
        open={isCodeRepoOpen}
        onOpenChange={(details) => setCodeRepoOpen(details.open)}
        size="md"
        placement="center"
        motionPreset="slide-in-bottom"
        scrollBehavior={'outside'}
      >
        <PMDialog.Trigger asChild>
          <PMButton size={size} variant={variant} disabled={disabled}>
            {label}
          </PMButton>
        </PMDialog.Trigger>
        <CodeRepositoryDialogContents
          selectedPackages={selectedPackages}
          onClose={() => setCodeRepoOpen(false)}
        />
      </PMDialog.Root>
    );
  }

  return (
    <>
      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          <PMButton size={size} variant={variant} disabled={disabled}>
            {label}
            <LuChevronDown aria-hidden />
          </PMButton>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content>
              <PMMenu.Item
                value={MENU_VALUE_CODE_REPOSITORIES}
                cursor={'pointer'}
                onClick={() => setCodeRepoOpen(true)}
              >
                To code repositories
              </PMMenu.Item>
              <PMMenu.Item
                value={MENU_VALUE_MARKETPLACES}
                cursor={'pointer'}
                onClick={() => setMarketplaceOpen(true)}
              >
                To marketplaces
              </PMMenu.Item>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>

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

      <RunMarketplacePublish
        open={isMarketplaceOpen}
        onOpenChange={setMarketplaceOpen}
        selectedPackages={selectedPackages}
      />
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
          selectedRecipes={[]}
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
