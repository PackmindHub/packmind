import React from 'react';
import { PMButton, PMHStack } from '@packmind/ui';
import { useRemovePackageFromTargetsContext } from './RemovePackageFromTargets';
import { PACKAGE_MESSAGES } from '../../constants/messages';

export const RemovePackageFromTargetsCTAImpl: React.FC = () => {
  const {
    remove,
    isRemoving,
    canRemove,
    currentStep,
    setCurrentStep,
    selectedTargetIds,
  } = useRemovePackageFromTargetsContext();

  if (currentStep === 'select') {
    return (
      <PMButton
        variant="primary"
        onClick={() => setCurrentStep('confirm')}
        size="sm"
        disabled={!canRemove}
      >
        {PACKAGE_MESSAGES.removal.confirmButtonLabel} (
        {selectedTargetIds.length})
      </PMButton>
    );
  }

  return (
    <PMHStack gap={2}>
      <PMButton
        variant="secondary"
        onClick={() => setCurrentStep('select')}
        size="sm"
        disabled={isRemoving}
      >
        {PACKAGE_MESSAGES.removal.backButtonLabel}
      </PMButton>
      <PMButton
        variant="primary"
        colorPalette="red"
        onClick={remove}
        loading={isRemoving}
        size="sm"
        disabled={!canRemove}
      >
        {PACKAGE_MESSAGES.removal.confirmButtonLabel}
      </PMButton>
    </PMHStack>
  );
};
