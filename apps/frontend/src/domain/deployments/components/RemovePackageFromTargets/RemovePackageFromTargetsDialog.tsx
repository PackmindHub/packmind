import React from 'react';
import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHeading,
  PMPortal,
  pmToaster,
} from '@packmind/ui';
import { Distribution, Package } from '@packmind/types';
import { RemovePackageFromTargets } from './RemovePackageFromTargets';
import { createPackageRemovalNotifications } from '../../utils/deploymentNotificationUtils';
import { PACKAGE_MESSAGES } from '../../constants/messages';

export interface RemovePackageFromTargetsDialogProps {
  selectedPackage: Package;
  distributions: Distribution[];
  /**
   * Held by the caller when given, which is what a menu item needs: clicking one
   * closes the menu, and a dialog mounted inside that menu would go with it.
   *
   * Left out, the dialog owns its own open state and `trigger` opens it.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The control that opens it, for callers with no state to hold. */
  trigger?: React.ReactNode;
}

/**
 * Taking a package back out of the targets it was distributed to, as a dialog
 * that does not care what opened it.
 *
 * Split out of `RemovePackageFromTargetsButton`, which is still the way to get
 * it from a toolbar and now renders this with a `trigger`. The split exists
 * because the same operation is reached from a menu on the context surface,
 * where the button shape cannot go.
 */
export const RemovePackageFromTargetsDialog: React.FC<
  RemovePackageFromTargetsDialogProps
> = ({ selectedPackage, distributions, open, onOpenChange, trigger }) => (
  <PMDialog.Root
    open={open}
    onOpenChange={
      onOpenChange ? (details) => onOpenChange(details.open) : undefined
    }
    size="md"
    placement="center"
    motionPreset="slide-in-bottom"
    scrollBehavior="outside"
  >
    {trigger && <PMDialog.Trigger asChild>{trigger}</PMDialog.Trigger>}
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
                  <PMDialog.CloseTrigger asChild>
                    <PMButton variant="tertiary" size="sm">
                      {PACKAGE_MESSAGES.removal.cancelButtonLabel}
                    </PMButton>
                  </PMDialog.CloseTrigger>
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
