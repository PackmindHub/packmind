import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
} from '@chakra-ui/react';
import { ReactNode, useRef } from 'react';
import { PMButton } from '../../form/PMButton/PMButton';
import { PMConfirmationModalHeader } from './PMConfirmationModalHeader';
import { PMConfirmationModalBody } from './PMConfirmationModalBody';
import { PMConfirmationModalFooter } from './PMConfirmationModalFooter';

export type PMConfirmationModalProps = {
  trigger: ReactNode;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColorScheme?: string;
  onConfirm: () => void;
  /** Omit to let DialogRoot manage open state itself (uncontrolled). */
  open?: boolean;
  onOpenChange?: (details: { open: boolean }) => void;
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
    <DialogRoot open={open} onOpenChange={onOpenChange} placement="center">
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <Portal>
        <DialogBackdrop />

        <DialogPositioner>
          <DialogContent>
            <PMConfirmationModalHeader>{title}</PMConfirmationModalHeader>

            <PMConfirmationModalBody>{message}</PMConfirmationModalBody>

            <PMConfirmationModalFooter>
              <PMButton
                variant="outline"
                onClick={() => onOpenChange?.({ open: false })}
              >
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
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
};

export { PMConfirmationModalHeader } from './PMConfirmationModalHeader';
export { PMConfirmationModalBody } from './PMConfirmationModalBody';
export { PMConfirmationModalFooter } from './PMConfirmationModalFooter';
