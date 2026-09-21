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
  artifactCount: number;
  kindSingular: string;
  kindPlural: string;
  emptiedPackages: EmptiedPackage[];
  onConfirm: () => Promise<void>;
}

/**
 * Where the emptied packages are distributed, as a phrase: what the artifacts
 * disappear from is the part of the warning the user acts on, so it names
 * repositories and marketplaces rather than lumping them into "places".
 */
function distributionPlaces(emptiedPackages: EmptiedPackage[]): string {
  const repositories = emptiedPackages.some((p) => p.deployedTargets > 0);
  const marketplaces = emptiedPackages.some((p) => p.deployedMarketplaces > 0);

  if (repositories && marketplaces) {
    return 'these repositories and marketplaces';
  }
  return marketplaces ? 'these marketplaces' : 'these repositories';
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
  artifactCount,
  kindSingular,
  kindPlural,
  emptiedPackages,
  onConfirm,
}: MoveArtifactsToPackageConfirmProps) => {
  const [isMoving, setIsMoving] = useState(false);
  const single = artifactCount === 1;
  const places = distributionPlaces(emptiedPackages);

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
                  ? `Move this ${kindSingular} to ${targetPackageName}?`
                  : `Move ${artifactCount} ${kindPlural} to ${targetPackageName}?`}
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton disabled={isMoving} />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>

            <PMDialog.Body>
              <PMVStack gap={4} alignItems="stretch">
                <PMText variant="body" color="secondary">
                  {single
                    ? 'It will be removed from:'
                    : 'They will be removed from:'}
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
                    {single
                      ? `Anyone working in ${places} loses this ${kindSingular} at their next sync.`
                      : `Anyone working in ${places} loses these ${kindPlural} at their next sync.`}
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
                  {single ? 'Move' : `Move ${artifactCount}`}
                </PMButton>
              </PMButtonGroup>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
