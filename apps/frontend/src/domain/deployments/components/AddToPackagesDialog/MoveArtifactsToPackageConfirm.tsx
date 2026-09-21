import { useState } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import {
  PMBox,
  PMButton,
  PMButtonGroup,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMIcon,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { deployedPlaceParts } from '../PackagesPopover';

export interface EmptiedPackage {
  packageName: string;
  deployedTargets: number;
  deployedMarketplaces: number;
}

interface MoveArtifactsToPackageConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPackageName: string;
  artifactNames: string[];
  emptiedPackages: EmptiedPackage[];
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation shown before a move takes artifacts out of a package that is
 * live somewhere. A move only ever asks when something stops shipping: adding
 * to a distributed package needs no warning, losing content from one does, and
 * the packages about to lose it are named with where they are distributed.
 */
export const MoveArtifactsToPackageConfirm = ({
  open,
  onOpenChange,
  targetPackageName,
  artifactNames,
  emptiedPackages,
  onConfirm,
}: MoveArtifactsToPackageConfirmProps) => {
  const [isMoving, setIsMoving] = useState(false);
  const count = artifactNames.length;
  const single = count === 1;

  const handleMove = async () => {
    setIsMoving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller surfaces the error; keep the dialog open so the user can retry.
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <PMDialog.Root
      closeOnInteractOutside={!isMoving}
      open={open}
      onOpenChange={(d) => onOpenChange(d.open)}
      size="md"
    >
      {/* Portal so the dialog escapes trees an open modal (e.g. the manage-
          packages drawer) has already marked aria-hidden. */}
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>
                {single
                  ? `Move to ${targetPackageName}?`
                  : `Move ${count} artifacts to ${targetPackageName}?`}
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton disabled={isMoving} />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>

            <PMDialog.Body>
              <PMVStack gap={4} alignItems="stretch">
                <PMText variant="body" color="secondary">
                  {single ? (
                    <>
                      <PMText as="span" fontWeight={500} color="primary">
                        {artifactNames[0]}
                      </PMText>{' '}
                      leaves the packages below and is bundled in{' '}
                      {targetPackageName} instead.
                    </>
                  ) : (
                    `These artifacts leave the packages below and are bundled in ${targetPackageName} instead.`
                  )}
                </PMText>

                <PMVStack
                  gap={2}
                  alignItems="stretch"
                  maxHeight="180px"
                  overflowY="auto"
                  borderRadius="sm"
                  border="1px solid"
                  borderColor="border.secondary"
                  padding={2}
                >
                  {emptiedPackages.map((emptied) => {
                    const deployedPlaces = deployedPlaceParts(
                      emptied.deployedTargets,
                      emptied.deployedMarketplaces,
                    ).join(' and ');
                    return (
                      <PMVStack
                        key={emptied.packageName}
                        gap={0}
                        alignItems="stretch"
                      >
                        <PMText variant="small" color="primary" truncate>
                          {emptied.packageName}
                        </PMText>
                        {deployedPlaces ? (
                          <PMText variant="small" color="faded">
                            Distributed to {deployedPlaces}
                          </PMText>
                        ) : null}
                      </PMVStack>
                    );
                  })}
                </PMVStack>

                <PMHStack
                  gap={2.5}
                  alignItems="flex-start"
                  padding={3}
                  borderRadius="sm"
                  backgroundColor="background.tertiary"
                >
                  <PMBox color="orange.300" paddingTop={0.5}>
                    <PMIcon fontSize="sm">
                      <LuTriangleAlert />
                    </PMIcon>
                  </PMBox>
                  <PMText variant="small" color="secondary">
                    Distributed packages stop shipping {single ? 'it' : 'them'}{' '}
                    at their next sync.
                  </PMText>
                </PMHStack>
              </PMVStack>
            </PMDialog.Body>

            <PMDialog.Footer>
              <PMButtonGroup size="sm">
                <PMDialog.Trigger asChild>
                  <PMButton variant="tertiary" disabled={isMoving}>
                    Cancel
                  </PMButton>
                </PMDialog.Trigger>
                <PMButton
                  variant="primary"
                  onClick={handleMove}
                  loading={isMoving}
                >
                  {single ? 'Move' : `Move ${count}`}
                </PMButton>
              </PMButtonGroup>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
