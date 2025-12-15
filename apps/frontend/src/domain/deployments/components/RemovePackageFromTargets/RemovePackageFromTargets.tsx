import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react';
import {
  Distribution,
  Package,
  RemovePackageFromTargetsResult,
  TargetId,
} from '@packmind/types';
import { useRemovePackageFromTargets } from '../../hooks';
import { RemovePackageFromTargetsBodyImpl } from './RemovePackageFromTargetsBody';
import { RemovePackageFromTargetsCTAImpl } from './RemovePackageFromTargetsCTA';

type RemovePackageFromTargetsStep = 'select' | 'confirm';

type RemovePackageFromTargetsCtxType = {
  distributions: Distribution[];
  selectedTargetIds: TargetId[];
  setSelectedTargetIds: Dispatch<SetStateAction<TargetId[]>>;
  currentStep: RemovePackageFromTargetsStep;
  setCurrentStep: Dispatch<SetStateAction<RemovePackageFromTargetsStep>>;
  isRemoving: boolean;
  remove: () => Promise<void>;
  canRemove: boolean;
  selectedPackage: Package;
};

const RemovePackageFromTargetsCtx =
  createContext<RemovePackageFromTargetsCtxType | null>(null);

export const useRemovePackageFromTargetsContext = () => {
  const ctx = useContext(RemovePackageFromTargetsCtx);
  if (!ctx) {
    throw new Error(
      'RemovePackageFromTargets.* must be used within <RemovePackageFromTargets>',
    );
  }
  return ctx;
};

interface RemovePackageFromTargetsProps {
  selectedPackage: Package;
  distributions: Distribution[];
  onRemovalComplete?: (results: RemovePackageFromTargetsResult[]) => void;
  children?: React.ReactNode;
}

const RemovePackageFromTargetsComponent: React.FC<
  RemovePackageFromTargetsProps
> = ({ selectedPackage, distributions, onRemovalComplete, children }) => {
  const { removePackageFromTargets, isRemoving } =
    useRemovePackageFromTargets();
  const [selectedTargetIds, setSelectedTargetIds] = useState<TargetId[]>([]);
  const [currentStep, setCurrentStep] =
    useState<RemovePackageFromTargetsStep>('select');

  const canRemove = selectedTargetIds.length > 0 && !isRemoving;

  const remove = useCallback(async () => {
    if (!canRemove) return;

    try {
      const response = await removePackageFromTargets(
        {
          id: selectedPackage.id,
          name: selectedPackage.name,
        },
        selectedTargetIds,
      );

      onRemovalComplete?.(response.results);
    } catch (e: unknown) {
      console.error('Removal failed:', e);
      throw e;
    }
  }, [
    canRemove,
    removePackageFromTargets,
    selectedPackage.id,
    selectedPackage.name,
    selectedTargetIds,
    onRemovalComplete,
  ]);

  const value = useMemo<RemovePackageFromTargetsCtxType>(
    () => ({
      distributions,
      selectedTargetIds,
      setSelectedTargetIds,
      currentStep,
      setCurrentStep,
      isRemoving,
      remove,
      canRemove,
      selectedPackage,
    }),
    [
      distributions,
      selectedTargetIds,
      currentStep,
      isRemoving,
      remove,
      canRemove,
      selectedPackage,
    ],
  );

  return (
    <RemovePackageFromTargetsCtx.Provider value={value}>
      {children}
    </RemovePackageFromTargetsCtx.Provider>
  );
};

export const RemovePackageFromTargets =
  RemovePackageFromTargetsComponent as React.FC<RemovePackageFromTargetsProps> & {
    Body: React.FC;
    Cta: React.FC;
  };

RemovePackageFromTargets.Body = RemovePackageFromTargetsBodyImpl;
RemovePackageFromTargets.Cta = RemovePackageFromTargetsCTAImpl;
