import { PMVStack, PMHeading, PMText, PMButton } from '@packmind/ui';

export function SignUpSplashScreen({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) {
  return (
    <PMVStack gap={8} align="center" justify="center" minH="60vh">
      <PMHeading level="h1" fontSize="3xl" textAlign="center">
        Get more done with AI-powered assistants
      </PMHeading>
      <PMText fontSize="xl" color="secondary" textAlign="center">
        Create, manage and deploy AI assistants tailored to your needs.
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
