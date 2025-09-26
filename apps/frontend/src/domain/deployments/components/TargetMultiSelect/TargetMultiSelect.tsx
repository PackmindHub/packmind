import React from 'react';
import {
  PMCombobox,
  PMVStack,
  PMPortal,
  pmUseFilter,
  pmUseListCollection,
} from '@packmind/ui';
import { Target } from '@packmind/shared';

interface InputValueChangeDetails {
  inputValue: string;
}

interface ValueChangeDetails {
  value: string[];
}

interface TargetMultiSelectProps {
  availableTargets: Target[];
  selectedTargetNames: string[];
  onSelectionChange: (targetNames: string[]) => void;
  placeholder?: string;
}

export const TargetMultiSelect: React.FC<TargetMultiSelectProps> = ({
  availableTargets,
  selectedTargetNames,
  onSelectionChange,
  placeholder = 'Filter by targets...',
}) => {
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  // Build unique target name items (deduplicate by name)
  const uniqueNames = Array.from(new Set(availableTargets.map((t) => t.name)));
  const targetItems = uniqueNames.map((name) => ({
    label: name,
    value: name,
  }));

  const { collection, filter } = pmUseListCollection({
    initialItems: targetItems,
    filter: contains,
  });

  const displayValue =
    selectedTargetNames.length === 0
      ? placeholder
      : `${selectedTargetNames.length} target${selectedTargetNames.length === 1 ? '' : 's'} selected`;

  const handleValueChange = (details: ValueChangeDetails) => {
    onSelectionChange(details.value);
  };

  return (
    <PMCombobox.Root
      collection={collection}
      onInputValueChange={(e: InputValueChangeDetails) => filter(e.inputValue)}
      onValueChange={handleValueChange}
      value={selectedTargetNames}
      multiple
      width="300px"
      openOnClick
      placeholder={displayValue}
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
          <PMCombobox.Content>
            <PMCombobox.Empty>No targets found</PMCombobox.Empty>

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
