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

/** Pluralized fragments like `['2 repos', '1 marketplace']`, zero counts omitted. */
export function deployedPlaceParts(
  repos: number,
  marketplaces: number,
): string[] {
  const parts: string[] = [];
  if (repos > 0) {
    parts.push(`${repos} ${repos === 1 ? 'repo' : 'repos'}`);
  }
  if (marketplaces > 0) {
    parts.push(
      `${marketplaces} ${marketplaces === 1 ? 'marketplace' : 'marketplaces'}`,
    );
  }
  return parts;
}

interface RemoveArtifactFromPackageConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageName: string;
  deployedTargets: number;
  deployedMarketplaces?: number;
  artifactNames: string[];
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation shown before removing one or more artifacts from a package. The
 * deployed warning banner only appears when the package is live on at least
 * one repo target or marketplace. With several artifacts the dialog lists them
 * so the blast radius is visible before confirming.
 */
export const RemoveArtifactFromPackageConfirm = ({
  open,
  onOpenChange,
  packageName,
  deployedTargets,
  deployedMarketplaces = 0,
  artifactNames,
  onConfirm,
}: RemoveArtifactFromPackageConfirmProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const count = artifactNames.length;
  const single = count === 1;
  const deployedPlaces = deployedPlaceParts(
    deployedTargets,
    deployedMarketplaces,
  ).join(' and ');

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller surfaces the error; keep the dialog open so the user can retry.
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <PMDialog.Root
      closeOnInteractOutside={!isRemoving}
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
                  ? `Remove from ${packageName}?`
                  : `Remove ${count} artifacts from ${packageName}?`}
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton disabled={isRemoving} />
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
                      stays in your library. This only unbundles it from this
                      package.
                    </>
                  ) : (
                    'These artifacts stay in your library. This only unbundles them from this package.'
                  )}
                </PMText>

                {!single ? (
                  <PMVStack
                    gap={1}
                    alignItems="stretch"
                    maxHeight="180px"
                    overflowY="auto"
                    borderRadius="sm"
                    border="1px solid"
                    borderColor="border.secondary"
                    padding={2}
                  >
                    {artifactNames.map((name) => (
                      <PMText
                        key={name}
                        variant="small"
                        color="primary"
                        truncate
                      >
                        {name}
                      </PMText>
                    ))}
                  </PMVStack>
                ) : null}

                {deployedPlaces ? (
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
                      {packageName} is deployed to {deployedPlaces}.
                    </PMText>
                  </PMHStack>
                ) : null}
              </PMVStack>
            </PMDialog.Body>

            <PMDialog.Footer>
              <PMButtonGroup size="sm">
                <PMDialog.Trigger asChild>
                  <PMButton variant="tertiary" disabled={isRemoving}>
                    Cancel
                  </PMButton>
                </PMDialog.Trigger>
                <PMButton
                  variant="danger"
                  onClick={handleRemove}
                  loading={isRemoving}
                >
                  {single ? 'Remove' : `Remove ${count}`}
                </PMButton>
              </PMButtonGroup>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
