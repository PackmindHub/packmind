import { useNavigate, Link } from 'react-router';
import { LuZap, LuUsers, LuCheck } from 'react-icons/lu';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMButton,
  PMText,
  PMCard,
  PMGrid,
  PMIcon,
  PMEm,
  PMHStack,
} from '@packmind/ui';
import { SignUpOptionsDataTestIds } from '@packmind/frontend';

export function SignUpOptions() {
  const navigate = useNavigate();

  return (
    <PMVStack gap={10} align="stretch">
      <PMVStack gap={3} textAlign="center">
        <PMHeading level="h1">Get your agent code your way</PMHeading>
        <PMText color="secondary" fontSize="lg">
          Choose how you want to start with Packmind
        </PMText>
      </PMVStack>

      <PMGrid
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
        gap={6}
        mb={6}
      >
        {/* Quick Start Card */}
        <PMCard.Root
          borderWidth="2px"
          borderRadius="xl"
          borderColor="blue.500"
          boxShadow="0 4px 20px rgba(59, 130, 246, 0.15)"
        >
          <PMCard.Body padding={8}>
            <PMVStack gap={6} align="stretch">
              <PMBox minHeight="160px">
                <PMVStack gap={4} align="center">
                  <PMIcon as={LuZap} size="2xl" color="blue.500" />
                  <PMHeading level="h3" textAlign="center">
                    Quick start
                  </PMHeading>
                  <PMText color="secondary" fontSize="md" textAlign="center">
                    Get your agent code <PMEm>your way</PMEm> in{' '}
                    <PMText as="span" fontWeight="semibold">
                      5 minutes
                    </PMText>
                  </PMText>
                </PMVStack>
              </PMBox>

              <PMButton
                onClick={() => navigate('/start-trial')}
                width="full"
                variant="primary"
                size="lg"
                mb={4}
                data-testid={SignUpOptionsDataTestIds.QuickStartButton}
              >
                Get started
              </PMButton>

              <PMVStack gap={2} align="flex-start">
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="blue.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Start in your IDE
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="blue.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    No account or credit card required
                  </PMText>
                </PMHStack>
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>

        {/* Create Account Card */}
        <PMCard.Root
          borderWidth="1px"
          borderRadius="xl"
          borderColor="border.secondary"
          backgroundColor="background.secondary"
        >
          <PMCard.Body padding={8}>
            <PMVStack gap={6} align="stretch">
              <PMBox minHeight="160px">
                <PMVStack gap={4} align="center">
                  <PMIcon as={LuUsers} size="2xl" color="purple.500" />
                  <PMHeading level="h3" textAlign="center">
                    Create an account
                  </PMHeading>
                  <PMText color="secondary" fontSize="md" textAlign="center">
                    Manage and distribute your organization's playbook at scale
                  </PMText>
                </PMVStack>
              </PMBox>

              <PMButton
                onClick={() => navigate('/create-account')}
                width="full"
                variant="secondary"
                size="lg"
                mb={4}
                data-testid={SignUpOptionsDataTestIds.CreateAccountButton}
              >
                Create account
              </PMButton>

              <PMVStack gap={2} align="flex-start">
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="purple.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    No credit card required
                  </PMText>
                </PMHStack>
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>
      </PMGrid>

      <PMBox mt={4} textAlign="center">
        <PMText>Already have an account? </PMText>
        <Link to="/sign-in" prefetch="intent">
          <PMButton variant="tertiary" size={'xs'} tabIndex={-1}>
            Sign in
          </PMButton>
        </Link>
      </PMBox>
    </PMVStack>
  );
}
