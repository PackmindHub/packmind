import React, { useMemo } from 'react';
import { PMButton, PMTooltip, PMSpinner } from '@packmind/ui';
import { Distribution, Package } from '@packmind/types';
import { RemovePackageFromTargetsDialog } from './RemovePackageFromTargetsDialog';
import { listActiveDistributions } from '../../utils/listActiveDistributions';
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
  const activeDistributions = useMemo(
    () => listActiveDistributions(distributions, selectedPackage.id),
    [distributions, selectedPackage.id],
  );
  const hasActiveDistributions = activeDistributions.length > 0;
  const isDisabled = !hasActiveDistributions || distributionsLoading;

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
    <RemovePackageFromTargetsDialog
      selectedPackage={selectedPackage}
      distributions={distributions}
      trigger={button}
    />
  );
};
