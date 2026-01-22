import { useNavigate, Link } from 'react-router';
import {
  LuMonitor,
  LuUsers,
  LuCheck,
  LuShield,
  LuFileText,
  LuInfo,
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
    <PMVStack gap={2} align="stretch">
      <PMVStack gap={3} textAlign="center" mb={6}>
        <PMHeading level="h1">Get your agent code your way</PMHeading>
        <PMText color="secondary" fontSize="lg">
          Packmind manage your AI playbook with standards, commands, and skills
          from your codebase.
        </PMText>
      </PMVStack>

      <PMGrid
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
        gap={{ base: 4, md: 6 }}
        mb={8}
        alignItems="stretch"
      >
        {/* Run Locally Card - Recommended */}
        <PMCard.Root
          borderRadius="md"
          boxShadow="0 4px 20px rgba(59, 130, 246, 0.15)"
          position="relative"
          borderColor="blue.800"
          zIndex={10}
          _hover={{
            borderColor: 'blue.500',
            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
            transform: 'translateY(-2px)',
            zIndex: 20,
          }}
          transition="all 0.3s ease"
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
                  <PMHStack align="center" justify="center">
                    <PMHeading level="h3" textAlign="center">
                      Build your AI playbook{' '}
                      <PMTooltip
                        label="Coding standards, commands, and specific knowledge (skills) generated from your codebase"
                        zIndex={10000}
                      >
                        <PMIcon
                          as={LuInfo}
                          size="sm"
                          color="gray.400"
                          ml={1}
                          cursor="help"
                        />
                      </PMTooltip>
                    </PMHeading>
                  </PMHStack>
                  <PMText color="secondary" fontSize="md" textAlign="center">
                    Quick setup, no account required. <PMEm>Run locally</PMEm>
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
                  <PMIcon as={LuShield} color="blue.600" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Code stays local
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuFileText} color="blue.600" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Ready in 2 minutes
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="blue.600" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Reuse across projects
                  </PMText>
                </PMHStack>
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>

        {/* Start with Account Card */}
        <PMCard.Root
          borderWidth="1px"
          borderRadius="md"
          backgroundColor="background.secondary"
          borderColor={'purple.800'}
          boxShadow="0 4px 20px rgba(147, 51, 234, 0.15)"
          zIndex={1}
          _hover={{
            borderColor: 'purple.400',
            boxShadow: '0 8px 30px rgba(147, 51, 234, 0.25)',
            transform: 'translateY(-2px)',
            zIndex: 5,
          }}
          transition="all 0.3s ease"
        >
          <PMCard.Body padding={8}>
            <PMVStack gap={6} align="stretch">
              <PMBox minHeight="160px">
                <PMVStack gap={4} align="center">
                  <PMIcon as={LuUsers} size="2xl" color="purple.500" />
                  <PMHeading level="h3" textAlign="center" color="primary">
                    Start with an account
                  </PMHeading>
                  <PMText color="secondary" fontSize="md" textAlign="center">
                    For team collaboration and governance
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
                    Team collaboration
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="purple.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Organization governance
                  </PMText>
                </PMHStack>
                <PMHStack gap={2} alignItems="flex-start">
                  <PMIcon as={LuCheck} color="purple.500" marginTop={0.5} />
                  <PMText fontSize="sm" color="secondary">
                    Free, no credit card
                  </PMText>
                </PMHStack>
              </PMVStack>
            </PMVStack>
          </PMCard.Body>
        </PMCard.Root>
      </PMGrid>

      <PMBox textAlign="center">
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
