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
  PMText,
  PMVStack,
} from '@packmind/ui';

interface RemoveArtifactFromPackageConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageName: string;
  deployedTargets: number;
  artifactName: string;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation shown before removing an artifact from a package. The deployed
 * warning banner only appears when the package is live on at least one target —
 * the artifact keeps shipping there until the next sync, then stops.
 */
export const RemoveArtifactFromPackageConfirm = ({
  open,
  onOpenChange,
  packageName,
  deployedTargets,
  artifactName,
  onConfirm,
}: RemoveArtifactFromPackageConfirmProps) => {
  const [isRemoving, setIsRemoving] = useState(false);

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
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Remove from {packageName}?</PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton disabled={isRemoving} />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>

          <PMDialog.Body>
            <PMVStack gap={4} alignItems="stretch">
              <PMText variant="body" color="secondary">
                <PMText as="span" fontWeight={500} color="primary">
                  {artifactName}
                </PMText>{' '}
                stays in your library. This only unbundles it from this package.
              </PMText>

              {deployedTargets > 0 ? (
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
                    {packageName} is deployed to {deployedTargets}{' '}
                    {deployedTargets === 1 ? 'repo' : 'repos'}. This artifact
                    keeps shipping until the next sync, then stops.
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
                Remove
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
