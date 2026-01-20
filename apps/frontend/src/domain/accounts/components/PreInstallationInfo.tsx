import React from 'react';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMIcon,
  PMAlert,
} from '@packmind/ui';
import { LuArrowRight } from 'react-icons/lu';

interface IPreInstallationInfoProps {
  onContinue: () => void;
}

export const PreInstallationInfo: React.FC<IPreInstallationInfoProps> = ({
  onContinue,
}) => {
  return (
    <PMVStack gap={8} align="stretch" maxW="2xl" mx="auto">
      <PMVStack gap={4} textAlign="center">
        <PMHeading level="h2">Before you start</PMHeading>
        <PMText color="secondary" fontSize="lg">
          Packmind runs locally to generate the playbook AI coding agents need
          to work in context.
        </PMText>
      </PMVStack>

      <PMVStack gap={6} align="flex-start">
        <PMBox>
          <PMHeading level="h4" mb={3}>
            Generated playbook
          </PMHeading>
          <PMVStack gap={1} align="flex-start">
            <PMText fontSize="sm" color="secondary">
              • Coding standards
            </PMText>
            <PMText fontSize="sm" color="secondary">
              • Agent instructions
            </PMText>
            <PMText fontSize="sm" color="secondary">
              • Project-specific commands and context
            </PMText>
          </PMVStack>
        </PMBox>

        <PMBox>
          <PMHeading level="h4" mb={3}>
            Your code stays local
          </PMHeading>
          <PMText fontSize="sm" color="secondary">
            Packmind never receives your source code or proprietary logic.
          </PMText>
        </PMBox>

        <PMAlert.Root status="info">
          <PMAlert.Indicator />
          <PMAlert.Title>
            A private workspace is created automatically. You can secure and
            share it later by creating an account.
          </PMAlert.Title>
        </PMAlert.Root>
      </PMVStack>

      <PMBox textAlign="center">
        <PMButton onClick={onContinue} size="lg" colorScheme="primary">
          Continue — select your AI assistant
          <PMIcon as={LuArrowRight} ml={2} />
        </PMButton>
      </PMBox>
    </PMVStack>
  );
};
