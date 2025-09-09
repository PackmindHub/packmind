import { DialogBody } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMConfirmationModalBodyProps = {
  children: ReactNode;
};

export const PMConfirmationModalBody = ({
  children,
  ...props
}: PMConfirmationModalBodyProps) => {
  return createElement(DialogBody as SlotComponent, props, children);
};
