import { Tabs } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot'; // adapte ce chemin

type PMTabsContentProps = {
  value: string;
  children: ReactNode;
};

export const PMTabsContent = ({ value, children }: PMTabsContentProps) => {
  return createElement(
    Tabs.Content as SlotComponent<{ value: string }>,
    { value },
    children,
  );
};
