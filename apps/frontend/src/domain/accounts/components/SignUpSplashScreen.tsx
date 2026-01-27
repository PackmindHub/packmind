import { PMVStack, PMHeading, PMText, PMButton } from '@packmind/ui';

export function SignUpSplashScreen({
  onGetStarted,
}: Readonly<{
  onGetStarted: () => void;
}>) {
  return (
    <PMVStack gap={8} align="center" justify="center" minH="60vh">
      <PMHeading level="h1" fontSize="3xl" textAlign="center">
        Get your agent code your way
      </PMHeading>
      <PMText fontSize="xl" color="secondary" textAlign="center">
        Packmind captures and governs your playbook so every AI agent follows
        your rules consistently, across teams and repos.
      </PMText>
      <PMButton
        size="lg"
        variant="primary"
        onClick={onGetStarted}
        data-testid="SignUpSplashScreen.GetStartedButton"
      >
        Get started
      </PMButton>
    </PMVStack>
  );
}
