import React from 'react';
import {
  PMButton,
  PMDialog,
  PMPortal,
  PMCloseButton,
  PMHeading,
  pmToaster,
  PMTooltip,
  PMSpinner,
} from '@packmind/ui';
import { Distribution, Package } from '@packmind/types';
import { RemovePackageFromTargets } from './RemovePackageFromTargets';
import { createPackageRemovalNotifications } from '../../utils/deploymentNotificationUtils';
import { PACKAGE_MESSAGES } from '../../constants/messages';

export interface RemovePackageFromTargetsButtonProps {
  selectedPackage: Package;
  distributions: Distribution[];
  distributionsLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RemovePackageFromTargetsButton: React.FC<
  RemovePackageFromTargetsButtonProps
> = ({
  selectedPackage,
  distributions,
  distributionsLoading = false,
  size = 'md',
}) => {
  const hasDistributions = distributions.length > 0;
  const isDisabled = !hasDistributions || distributionsLoading;

  const button = (
    <PMButton
      size={size}
      variant="outline"
      disabled={isDisabled}
      aria-label={PACKAGE_MESSAGES.removal.buttonLabel}
    >
      {distributionsLoading ? (
        <PMSpinner size="xs" />
      ) : (
        PACKAGE_MESSAGES.removal.buttonLabel
      )}
    </PMButton>
  );

  if (isDisabled && !distributionsLoading) {
    return (
      <PMTooltip label={PACKAGE_MESSAGES.removal.noDistributions}>
        {button}
      </PMTooltip>
    );
  }

  if (distributionsLoading) {
    return button;
  }

  return (
    <PMDialog.Root
      size="md"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior="outside"
    >
      <PMDialog.Trigger asChild>{button}</PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Context>
              {(store) => (
                <RemovePackageFromTargets
                  selectedPackage={selectedPackage}
                  distributions={distributions}
                  onRemovalComplete={(results) => {
                    store.setOpen(false);

                    const notifications = createPackageRemovalNotifications(
                      results,
                      selectedPackage.name,
                    );

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
                      <PMHeading level="h2">
                        {PACKAGE_MESSAGES.removal.dialogTitle}
                      </PMHeading>
                    </PMDialog.Title>
                    <PMDialog.CloseTrigger asChild>
                      <PMCloseButton size="sm" />
                    </PMDialog.CloseTrigger>
                  </PMDialog.Header>
                  <PMDialog.Body>
                    <RemovePackageFromTargets.Body />
                  </PMDialog.Body>
                  <PMDialog.Footer>
                    <PMDialog.Trigger asChild>
                      <PMButton variant="tertiary" size="sm">
                        {PACKAGE_MESSAGES.removal.cancelButtonLabel}
                      </PMButton>
                    </PMDialog.Trigger>
                    <RemovePackageFromTargets.Cta />
                  </PMDialog.Footer>
                </RemovePackageFromTargets>
              )}
            </PMDialog.Context>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
