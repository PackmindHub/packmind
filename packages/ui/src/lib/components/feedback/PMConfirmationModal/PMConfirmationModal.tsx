import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogCloseTrigger,
  DialogBackdrop,
} from '@chakra-ui/react';
import { ReactNode, useRef } from 'react';
import { PMButton } from '../../form/PMButton/PMButton';
import { PMConfirmationModalHeader } from './PMConfirmationModalHeader';
import { PMConfirmationModalBody } from './PMConfirmationModalBody';
import { PMConfirmationModalFooter } from './PMConfirmationModalFooter';

export type PMConfirmationModalProps = {
  /** The trigger element that opens the modal */
  trigger: ReactNode;
  /** Title displayed in the modal header */
  title: string;
  /** Message displayed in the modal body */
  message: string;
  /** Text for the confirm button (defaults to "Delete") */
  confirmText?: string;
  /** Text for the cancel button (defaults to "Cancel") */
  cancelText?: string;
  /** Color scheme for the confirm button (defaults to "red") */
  confirmColorScheme?: string;
  /** Callback function called when user confirms the action */
  onConfirm: () => void;
  /** Whether the modal is open (controlled mode) */
  open?: boolean;
  /** Callback function called when modal state changes (controlled mode) */
  onOpenChange?: (open: boolean) => void;
  /** Whether the confirm action is loading */
  isLoading?: boolean;
};

export const PMConfirmationModal = ({
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
}: PMConfirmationModalProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      {/* @ts-expect-error https://github.com/radix-ui/primitives/issues/2309#issuecomment-1916541133 */}
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogBackdrop />

      <DialogContent>
        <PMConfirmationModalHeader>{title}</PMConfirmationModalHeader>

        <PMConfirmationModalBody>{message}</PMConfirmationModalBody>

        <PMConfirmationModalFooter>
          <PMButton variant="outline" onClick={() => onOpenChange?.(false)}>
            {cancelText}
          </PMButton>
          <PMButton
            colorScheme={confirmColorScheme}
            onClick={handleConfirm}
            loading={isLoading}
            ml={3}
          >
            {confirmText}
          </PMButton>
        </PMConfirmationModalFooter>

        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
};

// Export slot components for advanced usage
export { PMConfirmationModalHeader } from './PMConfirmationModalHeader';
export { PMConfirmationModalBody } from './PMConfirmationModalBody';
export { PMConfirmationModalFooter } from './PMConfirmationModalFooter';
