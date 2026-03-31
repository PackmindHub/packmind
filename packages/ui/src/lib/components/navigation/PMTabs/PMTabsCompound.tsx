import { Tabs, TabsRootProps } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTabsCompoundListProps = {
  children: ReactNode;
};

const List = ({ children }: PMTabsCompoundListProps) => {
  return <Tabs.List mb={0}>{children}</Tabs.List>;
};

type PMTabsCompoundTriggerProps = {
  value: string;
  children: ReactNode;
  disabled?: boolean;
};

const Trigger = ({ value, children, disabled }: PMTabsCompoundTriggerProps) => {
  return createElement(
    Tabs.Trigger as SlotComponent<{ value: string; disabled?: boolean }>,
    { value, disabled },
    children,
  );
};

type PMTabsCompoundContentProps = {
  value: string;
  children: ReactNode;
};

const Content = ({ value, children }: PMTabsCompoundContentProps) => {
  return createElement(
    Tabs.Content as SlotComponent<{ value: string }>,
    { value },
    children,
  );
};

const Root = (props: TabsRootProps) => {
  return <Tabs.Root {...props} />;
};

export const PMTabsCompound = {
  Root,
  List,
  Trigger,
  Content,
};
