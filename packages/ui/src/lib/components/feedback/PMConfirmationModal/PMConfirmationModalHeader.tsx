import { DialogHeader } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMConfirmationModalHeaderProps = {
  children: ReactNode;
  fontSize?: string;
  fontWeight?: string;
};

export const PMConfirmationModalHeader = ({
  children,
  fontSize = 'lg',
  fontWeight = 'bold',
  ...props
}: PMConfirmationModalHeaderProps) => {
  return createElement(
    DialogHeader as SlotComponent<{ fontSize?: string; fontWeight?: string }>,
    { fontSize, fontWeight, ...props },
    children,
  );
};
