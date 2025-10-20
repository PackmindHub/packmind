import React, { useMemo } from 'react';
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

  // Remount combobox when available targets set changes so internal collection resets
  const itemsKey = useMemo(() => uniqueNames.join('|'), [uniqueNames]);

  const { collection, filter } = pmUseListCollection({
    initialItems: targetItems,
    filter: contains,
  });

  let displayValue = placeholder;
  if (selectedTargetNames.length > 0) {
    const count = selectedTargetNames.length;
    const plural = count === 1 ? '' : 's';
    displayValue = `${count} target${plural} selected`;
  }

  const handleValueChange = (details: ValueChangeDetails) => {
    onSelectionChange(details.value);
  };

  return (
    <PMCombobox.Root
      key={itemsKey}
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
