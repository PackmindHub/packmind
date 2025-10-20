import React from 'react';
import {
  PMCombobox,
  PMVStack,
  PMPortal,
  pmUseFilter,
  pmUseListCollection,
} from '@packmind/ui';

type AvailableRepository = {
  id: string;
  owner: string;
  repo: string;
  branch?: string | null;
};

interface RepositoryMultiSelectProps {
  availableRepositories: AvailableRepository[];
  selectedRepoIds: string[];
  onSelectionChange: (repoIds: string[]) => void;
  placeholder?: string;
}

export const RepositoryMultiSelect: React.FC<RepositoryMultiSelectProps> = ({
  availableRepositories,
  selectedRepoIds,
  onSelectionChange,
  placeholder = 'Filter by repositories...',
}) => {
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const repoItems = availableRepositories
    .map((r) => {
      const branchSuffix = r.branch ? ':' + r.branch : '';
      const label = r.owner + '/' + r.repo + branchSuffix;
      return { label, value: r.id };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const { collection, filter } = pmUseListCollection({
    initialItems: repoItems,
    filter: contains,
  });

  const displayValue = (() => {
    if (selectedRepoIds.length === 0) return placeholder;
    const suffix = selectedRepoIds.length === 1 ? 'y' : 'ies';
    return `${selectedRepoIds.length} repositor${suffix} selected`;
  })();

  return (
    <PMCombobox.Root
      collection={collection}
      onInputValueChange={(e: { inputValue: string }) => filter(e.inputValue)}
      onValueChange={(details: { value: string[] }) =>
        onSelectionChange(details.value)
      }
      value={selectedRepoIds}
      multiple
      openOnClick
      placeholder={displayValue}
      width={'xl'}
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
            <PMCombobox.Empty>No repositories found</PMCombobox.Empty>

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
