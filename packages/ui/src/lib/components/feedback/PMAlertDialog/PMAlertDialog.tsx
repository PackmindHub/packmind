import { Dialog, Portal } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { PMButton } from '../../form/PMButton/PMButton';

export type PMAlertDialogProps = {
  trigger?: ReactNode;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColorScheme?: string;
  onConfirm: () => void;
  /** Controlled mode: parent owns the open state. */
  open?: boolean;
  /** Controlled mode: called when the dialog wants to change open state. */
  onOpenChange?: (details: { open: boolean }) => void;
  isLoading?: boolean;
};

export const PMAlertDialog = ({
  trigger,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmColorScheme = 'red',
  onConfirm,
  open,
  onOpenChange,
  isLoading = false,
}: PMAlertDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    // Uncontrolled mode closes itself via Dialog.ActionTrigger; controlled mode
    // needs the parent notified explicitly.
    if (isControlled) {
      onOpenChange?.({ open: false });
    }
  };

  const isControlled = open !== undefined;

  return (
    <Dialog.Root
      open={isControlled ? open : undefined}
      onOpenChange={isControlled ? onOpenChange : undefined}
      placement="center"
    >
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>{message}</Dialog.Body>

            <Dialog.Footer>
              {/* Use Dialog.ActionTrigger only in uncontrolled mode */}
              {isControlled ? (
                <PMButton variant="outline" onClick={handleCancel}>
                  {cancelText}
                </PMButton>
              ) : (
                <Dialog.ActionTrigger asChild>
                  <PMButton variant="outline" onClick={handleCancel}>
                    {cancelText}
                  </PMButton>
                </Dialog.ActionTrigger>
              )}
              <PMButton
                colorScheme={confirmColorScheme}
                onClick={handleConfirm}
                loading={isLoading}
                ml={3}
              >
                {confirmText}
              </PMButton>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
