import {
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMBox,
  PMCarousel,
  PMIconButton,
  PMIcon,
} from '@packmind/ui';
import {
  LuChevronLeft,
  LuChevronRight,
  LuLightbulb,
  LuFileCode,
  LuShieldCheck,
} from 'react-icons/lu';

export function SignUpSplashScreen({
  onGetStarted,
}: Readonly<{
  onGetStarted: () => void;
}>) {
  const features = [
    {
      title: 'A single place for your knowledge',
      description:
        'Capture your team standards, patterns, and coding preferences as they emerge from your work.',
      icon: LuLightbulb,
    },
    {
      title: 'AI-friendly documentation',
      description:
        'Transform captured knowledge into actionable instructions that AI agents can follow consistently.',
      icon: LuFileCode,
    },
    {
      title: 'GenAI at scale',
      description:
        'Ensure every AI agent respects your latest rules and conventions across all teams and repositories.',
      icon: LuShieldCheck,
    },
  ];

  return (
    <PMVStack align="center" justify="center" minH="30vh" gap={6}>
      <PMBox textAlign="center">
        <PMHeading level="h2" textAlign="center">
          Get your agent code your way
        </PMHeading>
      </PMBox>

      <PMCarousel.Root slideCount={features.length} width="100%" maxW="600px">
        <PMCarousel.ItemGroup>
          {features.map((feature, index) => (
            <PMCarousel.Item key={index} index={index}>
              <PMBox
                p={10}
                textAlign="center"
                minH="280px"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap={6}
                backgroundColor={'{colors.background.secondary}'}
                borderRadius="xl"
                border="solid 1px"
                borderColor="border.tertiary"
                shadow="sm"
                transition="all 0.3s"
                _hover={{
                  shadow: 'md',
                }}
              >
                <PMBox
                  p={4}
                  borderRadius="full"
                  bg="blue.500"
                  color="white"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <PMIcon fontSize="3xl">
                    <feature.icon />
                  </PMIcon>
                </PMBox>
                <PMBox>
                  <PMHeading level="h5" mb={3}>
                    {feature.title}
                  </PMHeading>
                  <PMText fontSize="md" lineHeight="tall">
                    {feature.description}
                  </PMText>
                </PMBox>
              </PMBox>
            </PMCarousel.Item>
          ))}
        </PMCarousel.ItemGroup>

        <PMCarousel.Control justifyContent="center" gap={4} mt={6}>
          <PMCarousel.PrevTrigger asChild>
            <PMIconButton size="sm" variant="ghost" aria-label="Previous">
              <LuChevronLeft />
            </PMIconButton>
          </PMCarousel.PrevTrigger>
          <PMCarousel.Indicators
            backgroundColor={'{colors.background.faded}'}
            _current={{ bg: '{colors.branding.primary}' }}
          />
          <PMCarousel.NextTrigger asChild>
            <PMIconButton size="sm" variant="ghost" aria-label="Next">
              <LuChevronRight />
            </PMIconButton>
          </PMCarousel.NextTrigger>
        </PMCarousel.Control>
      </PMCarousel.Root>

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
