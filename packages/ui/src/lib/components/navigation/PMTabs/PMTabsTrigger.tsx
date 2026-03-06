import { Tabs } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTabsTriggerProps = {
  value: string;
  children: ReactNode;
  disabled?: boolean;
};

export const PMTabsTrigger = ({
  value,
  children,
  disabled,
}: PMTabsTriggerProps) => {
  return createElement(
    Tabs.Trigger as SlotComponent<{ value: string; disabled?: boolean }>,
    { value, disabled },
    children,
  );
};
