import React from 'react';
import { LuPlus, LuSearch } from 'react-icons/lu';
import {
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMNativeSelect,
} from '@packmind/ui';

const ADMIN_FILTER_ITEMS = [
  { label: 'Admin: any', value: 'any' },
  { label: 'Org admins', value: 'org-admins' },
  { label: 'Individual users', value: 'individual' },
];

const MEMBER_FILTER_ITEMS = [
  { label: 'Member: any', value: 'any' },
  { label: 'Org members', value: 'org-members' },
  { label: 'Individual users', value: 'individual' },
];

export const SpacesToolbar: React.FC = () => {
  return (
    <PMHStack gap={3} flexWrap="wrap" justify="flex-end">
      <PMHStack gap={2} maxWidth="280px" flex={1} minWidth="200px">
        <PMIcon color="text.faded">
          <LuSearch />
        </PMIcon>
        <PMInput
          type="search"
          placeholder="Search spaces..."
          aria-label="Search spaces"
          size="sm"
        />
      </PMHStack>
      <PMNativeSelect
        items={ADMIN_FILTER_ITEMS}
        defaultValue="any"
        size="sm"
        aria-label="Filter by admin"
      />
      <PMNativeSelect
        items={MEMBER_FILTER_ITEMS}
        defaultValue="any"
        size="sm"
        aria-label="Filter by member"
      />
      <PMButton variant="primary" size="sm" onClick={() => undefined}>
        <PMIcon>
          <LuPlus />
        </PMIcon>
        New space
      </PMButton>
    </PMHStack>
  );
};
