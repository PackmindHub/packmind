import {
  PMBox,
  PMButton,
  PMField,
  PMHStack,
  PMIcon,
  PMInput,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuCircleCheck,
  LuExternalLink,
  LuGithub,
  LuKeyRound,
  LuTriangleAlert,
} from 'react-icons/lu';
import type { ReauthDraft, UserConnection } from '../../types';

type ReauthPanelProps = {
  connection: UserConnection;
  draft: ReauthDraft;
  onChangePat: (value: string) => void;
  onValidatePat: () => void;
  onStartAppInstall: () => void;
};

export function ReauthPanel({
  connection,
  draft,
  onChangePat,
  onValidatePat,
  onStartAppInstall,
}: Readonly<ReauthPanelProps>) {
  return (
    <PMVStack gap={3} align="stretch">
      <PMHStack justify="space-between" align="baseline">
        <PMText
          fontSize="xs"
          color="faded"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="semibold"
        >
          Re-authenticate
        </PMText>
        <PMText fontSize="xs" color="faded">
          {connection.authMethod === 'app'
            ? 'GitHub App'
            : 'Personal access token'}
        </PMText>
      </PMHStack>

      {connection.status === 'token_expired' && (
        <ExpiredContext detail={connection.statusDetail} />
      )}

      {connection.authMethod === 'pat' ? (
        <PatReauthForm
          connection={connection}
          draft={draft}
          onChangePat={onChangePat}
          onValidatePat={onValidatePat}
        />
      ) : (
        <AppReauthForm
          connection={connection}
          draft={draft}
          onStartAppInstall={onStartAppInstall}
        />
      )}
    </PMVStack>
  );
}

function ExpiredContext({ detail }: Readonly<{ detail?: string }>) {
  return (
    <PMHStack
      gap={2}
      align="flex-start"
      paddingX={3}
      paddingY={2.5}
      borderRadius="md"
      bg="background.secondary"
      borderWidth="1px"
      borderColor="border.tertiary"
    >
      <PMIcon fontSize="sm" color="warning">
        <LuTriangleAlert />
      </PMIcon>
      <PMText fontSize="xs" color="secondary" flex={1}>
        {detail ??
          'This connection can no longer reach the vendor with the stored credentials.'}
      </PMText>
    </PMHStack>
  );
}

type PatReauthFormProps = {
  connection: UserConnection;
  draft: ReauthDraft;
  onChangePat: (value: string) => void;
  onValidatePat: () => void;
};

function PatReauthForm({
  connection,
  draft,
  onChangePat,
  onValidatePat,
}: Readonly<PatReauthFormProps>) {
  const isValidating = draft.status === 'validating';
  const isSuccess = draft.status === 'success';
  const hasError = draft.status === 'error';
  const submitDisabled = !draft.patValue.trim() || isValidating || isSuccess;

  const instanceHost = connection.identifier.split('/')[0];

  return (
    <PMVStack gap={3} align="stretch">
      <PMField.Root invalid={hasError}>
        <PMField.Label>
          <PMHStack gap={1.5} align="center">
            <PMIcon fontSize="xs" color="text.faded">
              <LuKeyRound />
            </PMIcon>
            <PMText fontSize="xs" color="secondary" fontWeight="medium">
              New personal access token
            </PMText>
          </PMHStack>
        </PMField.Label>
        <PMInput
          size="sm"
          type="password"
          autoComplete="off"
          autoFocus
          value={draft.patValue}
          placeholder={
            connection.vendor === 'gitlab'
              ? 'glpat-xxxxxxxxxxxxxxxxxxxx'
              : 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
          }
          onChange={(e) => onChangePat(e.target.value)}
          disabled={isValidating || isSuccess}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !submitDisabled) onValidatePat();
          }}
        />
        <PMField.HelperText>
          Validated against{' '}
          <PMText as="span" fontWeight="medium" color="primary">
            {instanceHost}
          </PMText>
          ; replaces the previous token on success.
        </PMField.HelperText>
      </PMField.Root>

      {isValidating && (
        <PMHStack gap={2} align="center" paddingX={1}>
          <PMSpinner size="xs" />
          <PMText fontSize="xs" color="secondary">
            Checking token against {instanceHost}…
          </PMText>
        </PMHStack>
      )}

      {isSuccess && (
        <PMHStack
          gap={2}
          align="flex-start"
          paddingX={3}
          paddingY={2.5}
          borderRadius="md"
          bg="background.secondary"
          borderWidth="1px"
          borderColor="border.tertiary"
        >
          <PMIcon fontSize="sm" color="success">
            <LuCircleCheck />
          </PMIcon>
          <PMVStack gap={0.5} align="start" flex={1}>
            <PMText fontSize="xs" color="success" fontWeight="medium">
              Token accepted.
            </PMText>
            <PMText fontSize="xs" color="secondary">
              Publishing is restored. The connection will move back to
              "connected" after the next status check.
            </PMText>
          </PMVStack>
        </PMHStack>
      )}

      {hasError && (
        <PMHStack
          gap={2}
          align="flex-start"
          paddingX={3}
          paddingY={2.5}
          borderRadius="md"
          bg="background.secondary"
          borderWidth="1px"
          borderColor="error"
        >
          <PMIcon fontSize="sm" color="error">
            <LuTriangleAlert />
          </PMIcon>
          <PMText fontSize="xs" color="error" flex={1}>
            {draft.errorMessage ??
              'That token did not validate. Confirm the scopes and that the token belongs to this instance.'}
          </PMText>
        </PMHStack>
      )}

      <PMBox>
        <PMText fontSize="2xs" color="faded">
          {connection.vendor === 'github'
            ? 'Needs scopes: repo (read/write), workflow.'
            : 'Needs scopes: api, read_repository, write_repository.'}
        </PMText>
      </PMBox>
    </PMVStack>
  );
}

type AppReauthFormProps = {
  connection: UserConnection;
  draft: ReauthDraft;
  onStartAppInstall: () => void;
};

function AppReauthForm({
  connection,
  draft,
  onStartAppInstall,
}: Readonly<AppReauthFormProps>) {
  const installing = draft.appPopupOpen || draft.status === 'validating';
  const success = draft.status === 'success';
  const hasError = draft.status === 'error';

  return (
    <PMVStack gap={3} align="stretch">
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        padding={4}
        bg="background.secondary"
      >
        <PMVStack gap={3} align="stretch">
          <PMHStack gap={2.5} align="center">
            <PMIcon fontSize="md" color="text.primary">
              <LuGithub />
            </PMIcon>
            <PMText fontSize="sm" color="primary" fontWeight="medium">
              Re-install the Packmind GitHub App
            </PMText>
          </PMHStack>
          <PMText fontSize="xs" color="secondary">
            Opens GitHub in a popup so you can confirm or re-grant the install
            on{' '}
            <PMText as="span" fontWeight="medium" color="primary">
              {connection.identifier}
            </PMText>
            . Repo access is reconfigured there; this connection picks the new
            install up automatically.
          </PMText>

          {!installing && !success && (
            <PMHStack gap={2}>
              <PMButton
                variant="secondary"
                size="sm"
                onClick={onStartAppInstall}
              >
                <PMHStack gap={1.5} align="center">
                  <PMIcon fontSize="xs">
                    <LuExternalLink />
                  </PMIcon>
                  <PMText fontSize="xs">Open GitHub</PMText>
                </PMHStack>
              </PMButton>
            </PMHStack>
          )}

          {installing && (
            <PMHStack gap={2} align="center">
              <PMSpinner size="xs" />
              <PMText fontSize="xs" color="secondary">
                Waiting for the install to complete on github.com…
              </PMText>
            </PMHStack>
          )}

          {success && (
            <PMHStack gap={2} align="flex-start">
              <PMIcon fontSize="sm" color="success">
                <LuCircleCheck />
              </PMIcon>
              <PMVStack gap={0.5} align="start" flex={1}>
                <PMText fontSize="xs" color="success" fontWeight="medium">
                  Install confirmed.
                </PMText>
                <PMText fontSize="xs" color="secondary">
                  Repo access picked up from the new install. Publishing resumes
                  on the next check.
                </PMText>
              </PMVStack>
            </PMHStack>
          )}

          {hasError && (
            <PMHStack gap={2} align="flex-start">
              <PMIcon fontSize="sm" color="error">
                <LuTriangleAlert />
              </PMIcon>
              <PMText fontSize="xs" color="error" flex={1}>
                {draft.errorMessage ??
                  'The install did not complete. Close the popup and try again.'}
              </PMText>
            </PMHStack>
          )}
        </PMVStack>
      </PMBox>

      <PMText fontSize="2xs" color="faded">
        Installed by {connection.installedBy}. Re-installing keeps your tracked
        repository list in Packmind; you can still remove individual repos
        afterward from the connection.
      </PMText>
    </PMVStack>
  );
}
