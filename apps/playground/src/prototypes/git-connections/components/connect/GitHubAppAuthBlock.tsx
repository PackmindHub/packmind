import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuCheck,
  LuExternalLink,
  LuGithub,
  LuShieldCheck,
} from 'react-icons/lu';
import type {
  AppInstallStatus,
  AppRegistrationStatus,
  Edition,
} from '../../types';

type GitHubAppAuthBlockProps = {
  edition: Edition;
  registration: AppRegistrationStatus;
  install: AppInstallStatus;
  connectedIdentifier: string | null;
  onRegister: () => void;
  onInstall: () => void;
  onChangeInstall: () => void;
};

export function GitHubAppAuthBlock({
  edition,
  registration,
  install,
  connectedIdentifier,
  onRegister,
  onInstall,
  onChangeInstall,
}: Readonly<GitHubAppAuthBlockProps>) {
  if (install === 'installed' && connectedIdentifier) {
    return (
      <ConnectedState
        identifier={connectedIdentifier}
        onChangeInstall={onChangeInstall}
      />
    );
  }

  const needsRegistration = edition === 'oss' && registration !== 'registered';

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

      {edition === 'oss' && (
        <EditionStepIndicator registration={registration} install={install} />
      )}

      {needsRegistration ? (
        <RegisterStep registration={registration} onRegister={onRegister} />
      ) : (
        <InstallStep install={install} onInstall={onInstall} />
      )}
    </PMVStack>
  );
}

function EditionStepIndicator({
  registration,
  install,
}: Readonly<{
  registration: AppRegistrationStatus;
  install: AppInstallStatus;
}>) {
  const step1Done = registration === 'registered';
  const step2Done = install === 'installed';
  const step1Active = !step1Done;
  const step2Active = step1Done && !step2Done;

  return (
    <PMHStack gap={2} align="center">
      <StepDot
        index={1}
        active={step1Active}
        done={step1Done}
        label="Register app"
      />
      <PMBox
        flex={1}
        height="1px"
        bg={step1Done ? 'branding.primary' : 'border.tertiary'}
      />
      <StepDot
        index={2}
        active={step2Active}
        done={step2Done}
        label="Install on repos"
      />
    </PMHStack>
  );
}

function StepDot({
  index,
  active,
  done,
  label,
}: Readonly<{ index: number; active: boolean; done: boolean; label: string }>) {
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
}

function RegisterStep({
  registration,
  onRegister,
}: Readonly<{
  registration: AppRegistrationStatus;
  onRegister: () => void;
}>) {
  const registering = registration === 'registering';
  return (
    <PMVStack gap={2} align="stretch">
      <PMButton
        variant="secondary"
        size="sm"
        onClick={onRegister}
        loading={registering}
        disabled={registering}
      >
        <PMIcon fontSize="sm">
          <LuGithub />
        </PMIcon>
        Register the Packmind GitHub App
      </PMButton>
      <PMText fontSize="xs" color="faded">
        Opens GitHub to register a new app for your organization. You'll be
        returned here automatically.
      </PMText>
    </PMVStack>
  );
}

function InstallStep({
  install,
  onInstall,
}: Readonly<{ install: AppInstallStatus; onInstall: () => void }>) {
  const installing = install === 'installing';
  return (
    <PMVStack gap={2} align="stretch">
      <PMButton
        variant="secondary"
        size="sm"
        onClick={onInstall}
        loading={installing}
        disabled={installing}
      >
        <PMIcon fontSize="sm">
          <LuGithub />
        </PMIcon>
        Install Packmind on GitHub
      </PMButton>
      <PMText fontSize="xs" color="faded">
        {installing
          ? 'Waiting for confirmation from GitHub.'
          : 'Opens a GitHub popup. Pick the orgs and repos to grant access.'}
      </PMText>
    </PMVStack>
  );
}

function ConnectedState({
  identifier,
  onChangeInstall,
}: Readonly<{ identifier: string; onChangeInstall: () => void }>) {
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
      <PMHStack gap={3} align="center">
        <PMBox
          width="28px"
          height="28px"
          borderRadius="full"
          bg="green.500"
          color="beige.0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <PMIcon fontSize="sm">
            <LuCheck />
          </PMIcon>
        </PMBox>
        <PMVStack gap={0.5} align="start" flex={1} minW={0}>
          <PMText fontSize="sm" fontWeight="semibold" color="primary">
            Installed on {identifier}
          </PMText>
          <PMText fontSize="xs" color="faded" truncate>
            Packmind can now publish to repos you granted access to.
          </PMText>
        </PMVStack>
      </PMHStack>
      <PMButton
        variant="outline"
        size="xs"
        onClick={onChangeInstall}
        alignSelf="flex-start"
      >
        <PMIcon fontSize="xs">
          <LuExternalLink />
        </PMIcon>
        Change install
      </PMButton>
    </PMVStack>
  );
}
