import { useNavigate, Link } from 'react-router';
import {
  LuMonitor,
  LuUsers,
  LuCheck,
  LuShield,
  LuFileText,
} from 'react-icons/lu';
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
  PMBadge,
  PMTooltip,
} from '@packmind/ui';
import { SignUpOptionsDataTestIds } from '@packmind/frontend';

export function SignUpOptions() {
  const navigate = useNavigate();

  return (
    <PMVStack gap={10} align="stretch">
      <PMVStack gap={3} textAlign="center">
        <PMHeading level="h1">Get your agent code your way</PMHeading>
        <PMText color="secondary" fontSize="lg">
          Packmind generates and manages rules, commands, and skills from your
          codebase.
        </PMText>
      </PMVStack>

      <PMGrid
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
        gap={6}
        mb={6}
      >
        {/* Run Locally Card - Recommended */}
        <PMCard.Root
          borderWidth="2px"
          borderRadius="xl"
          borderColor="blue.500"
          boxShadow="0 4px 20px rgba(59, 130, 246, 0.15)"
          position="relative"
        >
          <PMBadge
            position="absolute"
            top="-12px"
            left="50%"
            transform="translateX(-50%)"
            colorScheme="blue"
            fontWeight="bold"
            px={4}
            py={1}
            borderRadius="full"
            zIndex={1}
          >
            Recommended
          </PMBadge>
          <PMCard.Body padding={8}>
            <PMVStack gap={6} align="stretch">
              <PMBox minHeight="160px">
                <PMVStack gap={4} align="center">
                  <PMIcon as={LuMonitor} size="2xl" color="blue.500" />
                  <PMTooltip label="Coding standards, agent instructions, and project-specific commands generated from your codebase">
                    <PMHeading level="h3" textAlign="center" cursor="help">
                      Generate your AI playbook locally
                    </PMHeading>
                  </PMTooltip>
                  <PMText color="secondary" fontSize="md" textAlign="center">
                    Generate your AI playbook directly from your codebase.{' '}
                    <PMEm>No account required.</PMEm>
                  </PMText>
                </PMVStack>
              </PMBox>

              <PMButton
                onClick={() => navigate('/quick-start')}
                width="full"
                variant="primary"
                size="lg"
                mb={4}
                data-testid={SignUpOptionsDataTestIds.QuickStartButton}
              >
                Build your playbook
              </PMButton>

              <PMVStack gap={2} align="flex-start">
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuShield} color="blue.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Your code never leaves your machine
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuFileText} color="blue.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Playbook generated in 2 minutes
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="blue.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Save and reuse across projects later
                  </PMText>
                </PMHStack>
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>

        {/* Start with Account Card */}
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
                    Start with an account
                  </PMHeading>
                  <PMText color="secondary" fontSize="md" textAlign="center">
                    Create your account first for team collaboration and
                    governance
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
                    Team collaboration features
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="purple.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Organization-level governance
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="purple.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Free. No credit card required.
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
