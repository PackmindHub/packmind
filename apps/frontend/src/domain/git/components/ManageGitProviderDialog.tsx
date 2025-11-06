import React from 'react';
import {
  PMDialog,
  PMButton,
  PMCloseButton,
  PMPageSection,
  PMVStack,
  PMLink,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { GitProviderConnection } from './ManageGitProvider/GitProviderConnection';
import { GitProviderUI } from '../types/GitProviderTypes';
import { WebHookConfig } from './WebHookConfig';
import { RepositoriesManagement } from './ManageGitProvider/RepositoriesManagement';

interface ManageGitProviderDialogProps {
  organizationId: OrganizationId;
  editingProvider?: GitProviderUI | null;
  onSuccess?: (provider: GitProviderUI) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const ManageGitProviderDialog: React.FC<
  ManageGitProviderDialogProps
> = ({ organizationId, editingProvider = null, onSuccess, open, setOpen }) => {
  const [displayedScreen, setDisplayedScreen] = React.useState<
    'connection' | 'webhook' | 'repositories'
  >('connection');

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details) => {
        setDisplayedScreen('connection');
        setOpen(details.open);
      }}
      size={'cover'}
      scrollBehavior={'inside'}
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>
              {editingProvider ? 'Edit Git provider' : 'Add Git provider'}
            </PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body
            position={'relative'}
            display="grid"
            gridTemplateColumns={'120px 1fr'}
            gap={6}
            overflow={'hidden'}
          >
            <PMVStack alignItems={'stretch'} py={4}>
              <PMLink
                onClick={() => setDisplayedScreen('connection')}
                variant={displayedScreen === 'connection' ? 'active' : 'plain'}
              >
                Connection
              </PMLink>
              {editingProvider && (
                <PMLink
                  onClick={() => setDisplayedScreen('webhook')}
                  variant={displayedScreen === 'webhook' ? 'active' : 'plain'}
                >
                  Webhook
                </PMLink>
              )}
              {editingProvider && (
                <PMLink
                  onClick={() => setDisplayedScreen('repositories')}
                  variant={
                    displayedScreen === 'repositories' ? 'active' : 'plain'
                  }
                >
                  Repositories
                </PMLink>
              )}
            </PMVStack>

            <PMVStack gap={6} align={'stretch'} overflow={'auto'}>
              {displayedScreen === 'connection' && (
                <PMPageSection
                  title="Connection"
                  headingLevel="h5"
                  backgroundColor="primary"
                >
                  <GitProviderConnection
                    organizationId={organizationId}
                    editingProvider={editingProvider}
                    onSuccess={(provider) => {
                      if (onSuccess) onSuccess(provider);
                    }}
                  />
                </PMPageSection>
              )}

              {displayedScreen === 'webhook' && editingProvider && (
                <PMPageSection
                  title="Webhook"
                  headingLevel="h5"
                  backgroundColor="primary"
                >
                  <WebHookConfig providerVendor={editingProvider?.source} />
                </PMPageSection>
              )}

              {displayedScreen === 'repositories' && editingProvider && (
                <PMPageSection
                  title="Repositories"
                  headingLevel="h5"
                  backgroundColor="primary"
                >
                  <RepositoriesManagement provider={editingProvider} />
                </PMPageSection>
              )}
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMDialog.Trigger asChild>
              <PMButton variant="tertiary">Close</PMButton>
            </PMDialog.Trigger>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
