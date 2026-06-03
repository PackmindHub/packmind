import React, { useState } from 'react';
import {
  PMAlert,
  PMAlertDialog,
  PMBox,
  PMButton,
  PMHeading,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { useRevokeGithubAppMutation } from '../../api/queries/GitProviderQueries';

interface GitProviderAdvancedPanelProps {
  editingProvider: GitProviderUI;
  onRevoked: () => void;
}

export const GitProviderAdvancedPanel: React.FC<
  GitProviderAdvancedPanelProps
> = ({ editingProvider, onRevoked }) => {
  if (editingProvider.source !== 'github') {
    return <PMText color="secondary">Nothing to manage here yet.</PMText>;
  }

  return (
    <PMVStack alignItems="stretch" gap={6}>
      <RevokeGithubAppSection onRevoked={onRevoked} />
    </PMVStack>
  );
};

const RevokeGithubAppSection: React.FC<{ onRevoked: () => void }> = ({
  onRevoked,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revokeMutation = useRevokeGithubAppMutation();

  const handleConfirm = async () => {
    setError(null);
    try {
      await revokeMutation.mutateAsync();
      setIsOpen(false);
      onRevoked();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to revoke the GitHub App connection.',
      );
    }
  };

  return (
    <PMVStack alignItems="stretch" gap={3}>
      <PMHeading level="h5">Revoke app connection</PMHeading>
      <PMText color="secondary">
        Removes Packmind&apos;s stored credentials for this GitHub App. The App
        on github.com is not deleted — remove it from your GitHub settings if
        you no longer need it.
      </PMText>
      {error && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>{error}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}
      <PMBox>
        <PMAlertDialog
          trigger={
            <PMButton variant="danger" onClick={() => setIsOpen(true)}>
              Revoke app connection
            </PMButton>
          }
          title="Revoke GitHub App connection"
          message="Packmind will stop using these credentials. The App on github.com is not deleted — remove it manually if you no longer need it. This cannot be undone."
          confirmText="Revoke"
          cancelText="Cancel"
          confirmColorScheme="red"
          onConfirm={handleConfirm}
          open={isOpen}
          onOpenChange={({ open }) => {
            if (!revokeMutation.isPending) {
              setIsOpen(open);
            }
          }}
          isLoading={revokeMutation.isPending}
        />
      </PMBox>
    </PMVStack>
  );
};
