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
import { Recipe } from '@packmind/recipes/types';
export interface DeployRecipeButtonProps {
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  selectedRecipes: Recipe[];
}

export const DeployRecipeButton: React.FC<DeployRecipeButtonProps> = ({
  label = 'Deploy',
  disabled = false,
  size = 'md',
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
        <PMButton size={size} variant={'primary'} disabled={disabled}>
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
                  onDistributionComplete={() => {
                    store.setOpen(false);
                    pmToaster.create({
                      type: 'success',
                      title: 'Deployment done',
                      description: 'Recipes are now deployed on your repo(s)',
                    });
                  }}
                >
                  <PMDialog.Header>
                    <PMDialog.Title asChild>
                      <PMHeading level="h2">Deploy to repositories</PMHeading>
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
