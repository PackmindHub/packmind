import {
  Tabs,
  type TabsContentProps,
  type TabsListProps,
  type TabsRootProps,
  type TabsTriggerProps,
} from '@chakra-ui/react';

/**
 * The compound form of PMTabs, for tabs that need more than a label and a body:
 * a badge on a trigger, or a body that has to fill the height it is given.
 *
 * Every part forwards the props it is handed, since a tab body that cannot be
 * told to grow sends the caller back to a hand-rolled tab strip, which loses the
 * keyboard behaviour and the roles that come with the real control.
 */
const List = (props: TabsListProps) => <Tabs.List mb={0} {...props} />;

const Trigger = (props: TabsTriggerProps) => <Tabs.Trigger {...props} />;

const Content = (props: TabsContentProps) => <Tabs.Content {...props} />;

const Root = (props: TabsRootProps) => <Tabs.Root {...props} />;

export const PMTabsCompound = {
  Root,
  List,
  Trigger,
  Content,
};
