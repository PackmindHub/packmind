import React, { useState } from 'react';
import { Dialog, Portal } from '@chakra-ui/react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMSkeleton,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuCheck, LuGithub, LuShieldCheck } from 'react-icons/lu';
import { OrganizationId } from '@packmind/types';
import {
  useGetGithubAppManifestMutation,
  useGetGithubAppStatusQuery,
  useGithubAppInstallUrlMutation,
  useRevokeGithubAppMutation,
} from '../../api/queries/GitProviderQueries';
import { extractErrorMessage } from '../../utils/errorUtils';
import { redirectTo } from '../../../../shared/utils/navigation';

type GithubAppMode = 'on-prem' | 'shared';

type GitHubAppAuthBlockProps = {
  organizationId: OrganizationId;
  githubAppMode: GithubAppMode;
};

const appNameFromSlug = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const GitHubAppAuthBlock: React.FC<GitHubAppAuthBlockProps> = ({
  githubAppMode,
}) => {
  const installUrlMutation = useGithubAppInstallUrlMutation();
  const manifestMutation = useGetGithubAppManifestMutation();
  const revokeMutation = useRevokeGithubAppMutation();
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [revokeConfirmationInput, setRevokeConfirmationInput] = useState('');

  const statusQuery = useGetGithubAppStatusQuery();

  const expectedAppName = appNameFromSlug(statusQuery.data?.appSlug ?? '');
  const linkedProviderCount = statusQuery.data?.linkedProviderCount ?? 0;
  const hasLinkedProviders = linkedProviderCount > 0;
  const isRevokeConfirmEnabled =
    revokeConfirmationInput === expectedAppName &&
    expectedAppName.length > 0 &&
    !hasLinkedProviders &&
    !revokeMutation.isPending;

  const handleRevokeDialogOpenChange = (details: { open: boolean }) => {
    if (revokeMutation.isPending) return;
    setIsRevokeDialogOpen(details.open);
  };

  const handleRevokeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isRevokeConfirmEnabled) return;
    try {
      await revokeMutation.mutateAsync();
      setIsRevokeDialogOpen(false);
    } catch (err) {
      pmToaster.create({
        type: 'error',
        title: 'Failed to revoke',
        description: extractErrorMessage(
          err,
          'Failed to revoke the GitHub App registration.',
        ),
      });
    }
  };

  const handleInstallClick = async () => {
    try {
      const { installUrl } = await installUrlMutation.mutateAsync({});
      redirectTo(installUrl);
    } catch {
      // installUrlMutation.error surfaces below.
    }
  };

  const handleRegisterClick = async () => {
    try {
      const { manifest, state, manifestPostUrl } =
        await manifestMutation.mutateAsync();
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${manifestPostUrl}?state=${encodeURIComponent(state)}`;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'manifest';
      input.value = JSON.stringify(manifest);
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch {
      // manifestMutation.error surfaces below.
    }
  };

  const needsRegistration =
    githubAppMode === 'on-prem' && statusQuery.data?.hasApp === false;
  const installError = installUrlMutation.error?.message ?? null;
  const manifestError = manifestMutation.error?.message ?? null;

  return (
    <PMVStack
      gap={3}
      align="stretch"
      borderWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
      borderRadius="md"
      padding={4}
    >
      <PMHStack gap={2} align="center">
        <PMIcon fontSize="sm" color="branding.primary">
          <LuShieldCheck />
        </PMIcon>
        <PMText fontSize="sm" fontWeight="semibold" color="primary">
          Recommended: GitHub App
        </PMText>
      </PMHStack>

      <PMText fontSize="xs" color="secondary">
        Install the Packmind app on the orgs and repos you want to connect.
        Access is scoped per repo and credentials rotate automatically. Most
        teams use this.
      </PMText>

      {githubAppMode === 'on-prem' && statusQuery.isLoading && (
        <PMVStack align="stretch" gap={2}>
          <PMSkeleton h={9} w="full" rounded="md" />
          <PMSkeleton h={3} w="60%" rounded="sm" />
        </PMVStack>
      )}

      {githubAppMode === 'on-prem' && statusQuery.isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>
              Failed to load GitHub App status.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {githubAppMode === 'on-prem' && statusQuery.data && (
        <EditionStepIndicator
          registered={statusQuery.data.hasApp === true}
          installing={installUrlMutation.isPending}
        />
      )}

      {!statusQuery.isLoading && !statusQuery.isError && (
        <>
          {needsRegistration ? (
            <PMVStack gap={2} align="stretch">
              {manifestError && (
                <PMAlert.Root status="error">
                  <PMAlert.Indicator />
                  <PMAlert.Content>
                    <PMAlert.Description>{manifestError}</PMAlert.Description>
                  </PMAlert.Content>
                </PMAlert.Root>
              )}
              <PMButton
                variant="secondary"
                size="sm"
                onClick={handleRegisterClick}
                loading={manifestMutation.isPending}
                disabled={manifestMutation.isPending}
              >
                <PMIcon fontSize="sm">
                  <LuGithub />
                </PMIcon>
                Register the Packmind GitHub App
              </PMButton>
              <PMText fontSize="xs" color="faded">
                Opens GitHub to register a new app for your organization. You'll
                be returned here automatically.
              </PMText>
            </PMVStack>
          ) : (
            <PMVStack gap={2} align="stretch">
              {installError && (
                <PMAlert.Root status="error">
                  <PMAlert.Indicator />
                  <PMAlert.Content>
                    <PMAlert.Description>{installError}</PMAlert.Description>
                  </PMAlert.Content>
                </PMAlert.Root>
              )}
              <PMButton
                variant="secondary"
                size="sm"
                onClick={handleInstallClick}
                loading={installUrlMutation.isPending}
                disabled={installUrlMutation.isPending}
              >
                <PMIcon fontSize="sm">
                  <LuGithub />
                </PMIcon>
                Install Packmind on GitHub
              </PMButton>
              <PMText fontSize="xs" color="faded">
                Opens GitHub so you can pick the orgs and repos to grant access.
              </PMText>
              {githubAppMode === 'on-prem' && (
                <PMBox
                  as="button"
                  onClick={
                    revokeMutation.isPending
                      ? undefined
                      : () => setIsRevokeDialogOpen(true)
                  }
                  aria-disabled={revokeMutation.isPending}
                  bg="transparent"
                  border="none"
                  padding="0"
                  cursor={revokeMutation.isPending ? 'not-allowed' : 'pointer'}
                  opacity={revokeMutation.isPending ? 0.6 : 1}
                  fontSize="xs"
                  color="error"
                  fontWeight="medium"
                  textDecoration="underline"
                  textUnderlineOffset="2px"
                  _hover={{ color: 'red.400' }}
                  alignSelf="flex-start"
                  data-testid="github-app-auth-revoke-registration"
                >
                  {revokeMutation.isPending
                    ? 'Revoking…'
                    : 'Revoke registration'}
                </PMBox>
              )}
            </PMVStack>
          )}
        </>
      )}

      {githubAppMode === 'on-prem' && statusQuery.data?.hasApp === true && (
        <Dialog.Root
          open={isRevokeDialogOpen}
          onOpenChange={handleRevokeDialogOpenChange}
          placement="center"
          onExitComplete={() => setRevokeConfirmationInput('')}
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <form onSubmit={handleRevokeSubmit}>
                  <Dialog.Header>
                    <Dialog.Title>Revoke GitHub App registration?</Dialog.Title>
                  </Dialog.Header>

                  <Dialog.Body>
                    <PMVStack gap={4} align="stretch">
                      <PMText>
                        This removes the <strong>{expectedAppName}</strong>{' '}
                        registration for your organization. You'll be able to
                        register a new app afterward.
                      </PMText>
                      {hasLinkedProviders && (
                        <PMAlert.Root status="error">
                          <PMAlert.Indicator />
                          <PMAlert.Content>
                            <PMAlert.Title>
                              {linkedProviderCount}{' '}
                              {linkedProviderCount === 1
                                ? 'connection is'
                                : 'connections are'}{' '}
                              still using this app
                            </PMAlert.Title>
                            <PMAlert.Description>
                              Delete {linkedProviderCount === 1 ? 'it' : 'them'}{' '}
                              from the Connections tab before revoking the
                              registration.
                            </PMAlert.Description>
                          </PMAlert.Content>
                        </PMAlert.Root>
                      )}
                      <PMVStack gap={2} align="stretch">
                        <PMText variant="body" fontSize="sm">
                          Type <strong>{expectedAppName}</strong> to confirm:
                        </PMText>
                        <PMInput
                          placeholder="Enter app name"
                          value={revokeConfirmationInput}
                          onChange={(e) =>
                            setRevokeConfirmationInput(e.target.value)
                          }
                          disabled={hasLinkedProviders}
                          data-testid="github-app-auth-revoke-input"
                        />
                      </PMVStack>
                    </PMVStack>
                  </Dialog.Body>

                  <Dialog.Footer>
                    <Dialog.ActionTrigger asChild>
                      <PMButton
                        type="button"
                        variant="tertiary"
                        disabled={revokeMutation.isPending}
                      >
                        Cancel
                      </PMButton>
                    </Dialog.ActionTrigger>
                    <PMButton
                      type="submit"
                      colorScheme="red"
                      disabled={!isRevokeConfirmEnabled}
                      loading={revokeMutation.isPending}
                      ml={3}
                      data-testid="github-app-auth-revoke-confirm"
                    >
                      Revoke registration
                    </PMButton>
                  </Dialog.Footer>
                </form>

                <Dialog.CloseTrigger />
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </PMVStack>
  );
};

const EditionStepIndicator: React.FC<{
  registered: boolean;
  installing: boolean;
}> = ({ registered, installing }) => {
  const step1Active = !registered;
  const step2Active = registered && !installing;
  return (
    <PMHStack gap={2} align="center">
      <StepDot
        index={1}
        active={step1Active}
        done={registered}
        label="Register app"
      />
      <PMBox
        flex={1}
        height="1px"
        bg={registered ? 'branding.primary' : 'border.tertiary'}
      />
      <StepDot
        index={2}
        active={step2Active}
        done={false}
        label="Install on repos"
      />
    </PMHStack>
  );
};

const StepDot: React.FC<{
  index: number;
  active: boolean;
  done: boolean;
  label: string;
}> = ({ index, active, done, label }) => {
  return (
    <PMHStack gap={1.5} align="center">
      <PMBox
        width="18px"
        height="18px"
        borderRadius="full"
        bg={
          done
            ? 'branding.primary'
            : active
              ? 'background.tertiary'
              : 'transparent'
        }
        borderWidth="1px"
        borderColor={done ? 'branding.primary' : 'border.tertiary'}
        color={done ? 'beige.1000' : active ? 'text.primary' : 'text.faded'}
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="10px"
        fontWeight="bold"
      >
        {done ? <LuCheck /> : index}
      </PMBox>
      <PMText
        fontSize="xs"
        color={active || done ? 'secondary' : 'faded'}
        fontWeight={active ? 'medium' : 'normal'}
      >
        {label}
      </PMText>
    </PMHStack>
  );
};
