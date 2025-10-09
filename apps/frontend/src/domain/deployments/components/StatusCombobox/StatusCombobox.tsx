import React from 'react';
import {
  PMCombobox,
  PMPortal,
  PMVStack,
  pmUseFilter,
  pmUseListCollection,
} from '@packmind/ui';

export type RepositoryStatus = 'all' | 'outdated' | 'up-to-date';

const STATUS_ITEMS: ReadonlyArray<{ label: string; value: RepositoryStatus }> =
  [
    { label: 'All statuses', value: 'all' },
    { label: 'Outdated', value: 'outdated' },
    { label: 'Up-to-date', value: 'up-to-date' },
  ];

type StatusComboboxProps = {
  value: RepositoryStatus;
  onChange: (v: RepositoryStatus) => void;
};

export const StatusCombobox: React.FC<StatusComboboxProps> = ({
  value,
  onChange,
}) => {
  const { contains } = pmUseFilter({ sensitivity: 'base' });
  const { collection, filter } = pmUseListCollection({
    initialItems: STATUS_ITEMS as unknown as Array<{
      label: string;
      value: string;
    }>,
    filter: contains,
  });

  const placeholder =
    STATUS_ITEMS.find((i) => i.value === value)?.label || 'All statuses';

  return (
    <PMCombobox.Root
      collection={collection}
      openOnClick
      placeholder={placeholder}
      onInputValueChange={(e: { inputValue: string }) => filter(e.inputValue)}
      onValueChange={(details: { value: string | string[] }) => {
        const next = Array.isArray(details.value)
          ? (details.value[0] as RepositoryStatus)
          : (details.value as RepositoryStatus);
        onChange(next);
      }}
      width={'xs'}
    >
      <PMCombobox.Control>
        <PMVStack gap={0}>
          <PMCombobox.Input />
          <PMCombobox.IndicatorGroup>
            <PMCombobox.ClearTrigger />
            <PMCombobox.Trigger />
          </PMCombobox.IndicatorGroup>
        </PMVStack>
      </PMCombobox.Control>
      <PMPortal>
        <PMCombobox.Positioner>
          <PMCombobox.Content width={'fit-content'}>
            <PMCombobox.Empty>No status found</PMCombobox.Empty>
            {collection.items.map((item) => (
              <PMCombobox.Item item={item} key={item.value}>
                <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                <PMCombobox.ItemIndicator />
              </PMCombobox.Item>
            ))}
          </PMCombobox.Content>
        </PMCombobox.Positioner>
      </PMPortal>
    </PMCombobox.Root>
  );
};
