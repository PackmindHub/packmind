import { Tabs } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTabsTriggerProps = {
  value: string;
  children: ReactNode;
};

export const PMTabsTrigger = ({ value, children }: PMTabsTriggerProps) => {
  return createElement(
    Tabs.Trigger as SlotComponent<{ value: string }>,
    { value },
    children,
  );
};
