import { DialogFooter } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMConfirmationModalFooterProps = {
  children: ReactNode;
};

export const PMConfirmationModalFooter = ({
  children,
  ...props
}: PMConfirmationModalFooterProps) => {
  return createElement(DialogFooter as SlotComponent, props, children);
};
