import {
  DataListRoot as ChakraDataList,
  DataListRootProps,
  DataListItem,
  DataListItemLabel,
  DataListItemValue,
} from '@chakra-ui/react';
import React from 'react';

export interface PMDataListItem {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface PMDataListProps extends DataListRootProps {
  items: PMDataListItem[];
}

export const PMDataList: React.FC<PMDataListProps> = ({ items, ...rest }) => (
  <ChakraDataList {...rest}>
    {items.map((item, idx) => (
      <DataListItem key={idx}>
        <DataListItemLabel>{item.label}</DataListItemLabel>
        <DataListItemValue>{item.value}</DataListItemValue>
      </DataListItem>
    ))}
  </ChakraDataList>
);
