import { useNavigate } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMButton,
  PMText,
  PMCard,
  PMGrid,
} from '@packmind/ui';

export function SignUpOptions() {
  const navigate = useNavigate();

  return (
    <PMVStack gap={8} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h1">Let's get started</PMHeading>
      </PMBox>

      <PMGrid
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
        gap={6}
        mb={6}
      >
        {/* Quick Start Card */}
        <PMCard.Root
          borderWidth="1px"
          borderRadius="lg"
          borderColor="border.tertiary"
        >
          <PMCard.Body>
            <PMVStack gap={6} align="stretch">
              <PMBox minHeight="100px">
                <PMVStack gap={2} align="flex-start">
                  <PMHeading level="h3">
                    <span role="img" aria-label="lightning">
                      ⚡
                    </span>{' '}
                    Quick start
                  </PMHeading>
                  <PMText color="secondary">
                    Get your agent code <i>your way</i> in 5 minutes
                  </PMText>
                </PMVStack>
              </PMBox>

              <PMButton
                onClick={() => navigate('/start-trial')}
                width="full"
                variant="primary"
              >
                Get started
              </PMButton>

              <PMVStack gap={1} align="flex-start">
                <PMText fontSize="sm" color="secondary">
                  • Start in your IDE.
                </PMText>
                <PMText fontSize="sm" color="secondary">
                  • No account or credit card required.
                </PMText>
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>

        {/* Create Account Card */}
        <PMCard.Root
          borderWidth="1px"
          borderRadius="lg"
          borderColor="border.tertiary"
        >
          <PMCard.Body>
            <PMVStack gap={6} align="stretch">
              <PMBox minHeight="100px">
                <PMVStack gap={2} align="flex-start">
                  <PMHeading level="h3">Create an account</PMHeading>
                  <PMText color="secondary">
                    Manage and distribute your organization's playbook at scale
                  </PMText>
                </PMVStack>
              </PMBox>

              <PMButton
                onClick={() => navigate('/create-account')}
                width="full"
                variant="primary"
              >
                Create account
              </PMButton>

              <PMVStack gap={1} align="flex-start">
                <PMText fontSize="sm" color="secondary">
                  • No credit card required.
                </PMText>
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>
      </PMGrid>
    </PMVStack>
  );
}
