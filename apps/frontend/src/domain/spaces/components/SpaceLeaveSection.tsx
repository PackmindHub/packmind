import { Dialog, Portal } from '@chakra-ui/react';
import { useState } from 'react';
import {
  PMButton,
  PMHeading,
  PMHStack,
  PMInput,
  PMPageSection,
  PMText,
  PMVStack,
} from '@packmind/ui';

import { useCurrentSpace } from '../hooks/useCurrentSpace';

function LeaveSpaceConfirmationDialog({
  spaceName,
  onConfirm,
}: Readonly<{
  spaceName: string;
  onConfirm: () => void;
}>) {
  const [confirmationInput, setConfirmationInput] = useState('');

  const isConfirmEnabled = confirmationInput === spaceName;

  return (
    <Dialog.Root
      placement="center"
      onExitComplete={() => setConfirmationInput('')}
    >
      <Dialog.Trigger asChild>
        <PMButton variant="danger">Leave this space</PMButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Leave space</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <PMVStack gap={4} align="stretch">
                <PMText>
                  You are about to leave <strong>{spaceName}</strong>. You will
                  lose access to its standards, commands, skills, and other
                  content. You can rejoin later if the space is open or if an
                  admin invites you.
                </PMText>
                <PMVStack gap={2} align="stretch">
                  <PMText variant="body" fontSize="sm">
                    Type <strong>{spaceName}</strong> to confirm:
                  </PMText>
                  <PMInput
                    placeholder="Enter space name"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                  />
                </PMVStack>
              </PMVStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <PMButton variant="tertiary">Cancel</PMButton>
              </Dialog.ActionTrigger>
              <PMButton
                colorScheme="red"
                disabled={!isConfirmEnabled}
                onClick={onConfirm}
                ml={3}
              >
                Leave
              </PMButton>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export function SpaceLeaveSection() {
  const { space } = useCurrentSpace();

  if (!space) {
    return null;
  }

  return (
    <PMPageSection
      variant="outline"
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Leave space
        </PMHeading>
      }
    >
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMText variant="body" color="secondary">
          You will lose access to all standards, commands, skills, and other
          content in this space. You can rejoin later if the space is open or if
          an admin invites you.
        </PMText>
        <PMHStack justify="flex-end">
          <LeaveSpaceConfirmationDialog
            spaceName={space.name}
            onConfirm={() => {
              /* TODO: wire to API */
            }}
          />
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
