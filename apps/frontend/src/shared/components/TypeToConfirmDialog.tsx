import { Dialog, Portal } from '@chakra-ui/react';
import { useState } from 'react';
import { PMButton, PMInput, PMText, PMVStack } from '@packmind/ui';

type TypeToConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  expectedValue: string;
  inputPlaceholder: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
};

export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  expectedValue,
  inputPlaceholder,
  confirmLabel,
  isPending,
  onConfirm,
}: Readonly<TypeToConfirmDialogProps>) {
  const [confirmationInput, setConfirmationInput] = useState('');

  const isConfirmEnabled = confirmationInput === expectedValue && !isPending;

  const handleOpenChange = (details: { open: boolean }) => {
    if (isPending) {
      return;
    }
    onOpenChange(details.open);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConfirmEnabled) {
      return;
    }
    onConfirm();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={handleOpenChange}
      placement="center"
      onExitComplete={() => setConfirmationInput('')}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <form onSubmit={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>{title}</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <PMVStack gap={4} align="stretch">
                  {children}
                  <PMVStack gap={2} align="stretch">
                    <PMText variant="body" fontSize="sm">
                      Type <strong>{expectedValue}</strong> to confirm:
                    </PMText>
                    <PMInput
                      placeholder={inputPlaceholder}
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                    />
                  </PMVStack>
                </PMVStack>
              </Dialog.Body>

              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <PMButton
                    type="button"
                    variant="tertiary"
                    disabled={isPending}
                  >
                    Cancel
                  </PMButton>
                </Dialog.ActionTrigger>
                <PMButton
                  type="submit"
                  colorScheme="red"
                  disabled={!isConfirmEnabled}
                  loading={isPending}
                  aria-label={confirmLabel}
                  ml={3}
                >
                  {confirmLabel}
                </PMButton>
              </Dialog.Footer>
            </form>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
