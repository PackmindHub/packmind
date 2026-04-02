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

const MOCK_SPACE_NAME = 'My Space';

function DeleteSpaceConfirmationDialog({
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
        <PMButton variant="danger">Delete this space</PMButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete space</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <PMVStack gap={4} align="stretch">
                <PMText>
                  This will permanently delete <strong>{spaceName}</strong> and
                  all its standards, commands, skills, and members. This action
                  cannot be undone.
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
                Delete
              </PMButton>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export function SpaceDangerZoneSection() {
  return (
    <PMPageSection
      variant="outline"
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Danger zone
        </PMHeading>
      }
    >
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMText variant="body" color="secondary">
          Once deleted, all standards, commands, skills, and members associated
          with this space will be permanently removed. This action cannot be
          undone.
        </PMText>
        <PMHStack justify="flex-end">
          <DeleteSpaceConfirmationDialog
            spaceName={MOCK_SPACE_NAME}
            onConfirm={() => {
              /* TODO: wire to API */
            }}
          />
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
