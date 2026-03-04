import { Tabs, TabsRootProps } from '@chakra-ui/react';
import { PMTabsTrigger } from './PMTabsTrigger';
import { PMTabsContent } from './PMTabsContent';

type PMTabData = {
  value: string;
  triggerLabel: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
};

interface PMTabsProps extends TabsRootProps {
  defaultValue: string;
  tabs: PMTabData[];
  scrollableContent?: boolean;
}

export const PMTabs = ({ tabs, defaultValue, ...rest }: PMTabsProps) => {
  return (
    <Tabs.Root defaultValue={defaultValue} {...rest}>
      <Tabs.List mb={0}>
        {tabs.map((tab) => (
          <PMTabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
          >
            {tab.triggerLabel}
          </PMTabsTrigger>
        ))}
      </Tabs.List>

      {tabs
        .filter((tab) => tab.content != null)
        .map((tab) => (
          <PMTabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </PMTabsContent>
        ))}
    </Tabs.Root>
  );
};
