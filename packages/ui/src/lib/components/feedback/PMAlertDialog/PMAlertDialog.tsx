import { Dialog, Portal } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { PMButton } from '../../form/PMButton/PMButton';

export type PMAlertDialogProps = {
  /** The trigger element that opens the alert dialog */
  trigger?: ReactNode;
  /** Title displayed in the alert dialog header */
  title: string;
  /** Message displayed in the alert dialog body */
  message: string;
  /** Text for the confirm button (defaults to "Delete") */
  confirmText?: string;
  /** Text for the cancel button (defaults to "Cancel") */
  cancelText?: string;
  /** Color scheme for the confirm button (defaults to "red") */
  confirmColorScheme?: string;
  /** Callback function called when user confirms the action */
  onConfirm: () => void;
  /** Whether the alert dialog is open (controlled mode) */
  open?: boolean;
  /** Callback function called when alert dialog state changes (controlled mode) */
  onOpenChange?: (details: { open: boolean }) => void;
  /** Whether the confirm action is loading */
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
    // In controlled mode, we need to call onOpenChange to update parent state
    // In uncontrolled mode, Dialog.ActionTrigger handles the closing automatically
    if (isControlled) {
      onOpenChange?.({ open: false });
    }
    // Note: In uncontrolled mode, Dialog.ActionTrigger will handle the closing
  };

  // Determine if we're in controlled mode
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
