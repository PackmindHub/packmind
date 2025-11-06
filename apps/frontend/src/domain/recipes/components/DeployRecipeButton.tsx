import React from 'react';
import {
  PMButton,
  PMDialog,
  PMPortal,
  PMCloseButton,
  PMHeading,
  pmToaster,
} from '@packmind/ui';
import { RunDistribution } from '../../deployments/components/RunDistribution/RunDistribution';
import { Recipe } from '@packmind/types';
import { createSeparateDeploymentNotifications } from '../../deployments/utils/deploymentNotificationUtils';
export interface DeployRecipeButtonProps {
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'tertiary';
  selectedRecipes: Recipe[];
}

export const DeployRecipeButton: React.FC<DeployRecipeButtonProps> = ({
  label = 'Deploy',
  disabled = false,
  size = 'md',
  variant = 'primary',
  selectedRecipes,
}) => {
  return (
    <PMDialog.Root
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
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Context>
              {(store) => (
                <RunDistribution
                  selectedRecipes={selectedRecipes}
                  selectedStandards={[]}
                  onDistributionComplete={(deploymentResults) => {
                    store.setOpen(false);

                    if (deploymentResults) {
                      const notifications =
                        createSeparateDeploymentNotifications(
                          deploymentResults.recipesDeployments,
                          deploymentResults.standardsDeployments,
                        );

                      // Create separate toaster for each status type
                      notifications.forEach((notification) => {
                        pmToaster.create({
                          type: notification.type,
                          title: notification.title,
                          description: notification.description,
                        });
                      });
                    } else {
                      // Fallback for backward compatibility
                      pmToaster.create({
                        type: 'success',
                        title: 'Deployment done',
                        description:
                          'Recipe(s) are now deployed to your targets',
                      });
                    }
                  }}
                >
                  <PMDialog.Header>
                    <PMDialog.Title asChild>
                      <PMHeading level="h2">Deploy to targets</PMHeading>
                    </PMDialog.Title>
                    <PMDialog.CloseTrigger asChild>
                      <PMCloseButton size="sm" />
                    </PMDialog.CloseTrigger>
                  </PMDialog.Header>
                  <PMDialog.Body>
                    <RunDistribution.Body />
                  </PMDialog.Body>
                  <PMDialog.Footer>
                    <PMDialog.Trigger asChild>
                      <PMButton variant="tertiary" size="sm">
                        Cancel
                      </PMButton>
                    </PMDialog.Trigger>
                    <RunDistribution.Cta />
                  </PMDialog.Footer>
                </RunDistribution>
              )}
            </PMDialog.Context>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
