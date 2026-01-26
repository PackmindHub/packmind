import React from 'react';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMIcon,
  PMAlert,
  PMCard,
  PMGrid,
  PMTooltip,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuFileCode,
  LuBrain,
  LuTerminal,
  LuInfo,
} from 'react-icons/lu';
import { PreInstallationInfoDataTestIds } from '@packmind/frontend';

interface IPreInstallationInfoProps {
  onContinue: () => void;
}

export const PreInstallationInfo: React.FC<IPreInstallationInfoProps> = ({
  onContinue,
}) => {
  return (
    <PMVStack
      gap={8}
      align="stretch"
      maxW="2xl"
      mx="auto"
      data-testid={PreInstallationInfoDataTestIds.Component}
    >
      <PMVStack gap={4} textAlign="center">
        <PMHeading level="h2">Before you start</PMHeading>
        <div
          style={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <iframe
            src="https://www.youtube.com/embed/WGRz75_UmRQ?si=HtgsStA7b--4LiGg"
            title="Démo du flow d'onboarding Packmind"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        </div>
      </PMVStack>

      <PMVStack gap={6} align="stretch">
        {/* <PMBox
          border={'solid 1px'}
          borderColor={'blue.800'}
          p={4}
          borderRadius={'md'}
          backgroundColor={'blue.1000'}
        >
          <PMHeading level="h6" mb={4} textTransform={'uppercase'}>
            Generated playbook
          </PMHeading>
          <PMGrid gridTemplateColumns="repeat(3, 1fr)" gap={4}>
            <PMTooltip label="Standards define the rules the AI should always follow — use them to ensure consistent behavior across all interactions.">
              <PMCard.Root p={4} textAlign="center" cursor="help">
                <PMVStack gap={2} align="center">
                  <PMIcon as={LuFileCode} size="lg" color="blue.500" />
                  <PMText
                    fontSize="sm"
                    fontWeight="medium"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    Standards
                    <PMIcon as={LuInfo} size="xs" color="gray.500" />
                  </PMText>
                </PMVStack>
              </PMCard.Root>
            </PMTooltip>

            <PMTooltip label="Commands are shortcuts you can run to trigger a specific action — use them to quickly repeat common tasks.">
              <PMCard.Root p={4} textAlign="center" cursor="help">
                <PMVStack gap={2} align="center">
                  <PMIcon as={LuTerminal} size="lg" color="purple.500" />
                  <PMText
                    fontSize="sm"
                    fontWeight="medium"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    Commands
                    <PMIcon as={LuInfo} size="xs" color="gray.500" />
                  </PMText>
                </PMVStack>
              </PMCard.Root>
            </PMTooltip>

            <PMTooltip label="Skills give the AI the ability to handle a type of task on its own — use them when a task requires structured know-how or multiple steps.">
              <PMCard.Root p={4} textAlign="center" cursor="help">
                <PMVStack gap={2} align="center">
                  <PMIcon as={LuBrain} size="lg" color="green.500" />
                  <PMText
                    fontSize="sm"
                    fontWeight="medium"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    Skills
                    <PMIcon as={LuInfo} size="xs" color="gray.500" />
                  </PMText>
                </PMVStack>
              </PMCard.Root>
            </PMTooltip>
          </PMGrid>
        </PMBox> */}

        <PMAlert.Root status="success">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Your code stays on your machine</PMAlert.Title>
            <PMAlert.Description>
              Packmind does not have access to your whole codebase. Only code
              samples can be added to standards to illustrate how rules should
              be applied.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>

        <PMAlert.Root status="info">
          <PMAlert.Description>
            A private workspace containing generated playbook is created
            automatically. You can secure and share it later by creating an
            account.
          </PMAlert.Description>
        </PMAlert.Root>
      </PMVStack>

      <PMBox textAlign="center" mt={2}>
        <PMButton
          onClick={onContinue}
          size="lg"
          colorScheme="primary"
          data-testid={PreInstallationInfoDataTestIds.ContinueButton}
        >
          Continue — select your AI assistant
          <PMIcon as={LuArrowRight} ml={2} />
        </PMButton>
      </PMBox>
    </PMVStack>
  );
};
