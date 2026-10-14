import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LuGitBranch } from 'react-icons/lu';
import { PMAutocomplete } from './PMAutocomplete';

const BRANCHES = [
  'main',
  'develop',
  'feature/login',
  'feature/signup',
  'fix/typo',
];

const meta: Meta<typeof PMAutocomplete> = {
  title: 'Form/PMAutocomplete',
  component: PMAutocomplete,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof PMAutocomplete>;

const FilteredAutocomplete = (
  props: Partial<React.ComponentProps<typeof PMAutocomplete>>,
) => {
  const [typed, setTyped] = useState('');
  const items = useMemo(
    () =>
      BRANCHES.filter((branch) =>
        branch.toLowerCase().includes(typed.trim().toLowerCase()),
      ),
    [typed],
  );
  return (
    <PMAutocomplete
      items={items}
      onInputChange={setTyped}
      onPick={(value) => alert(`Picked ${value}`)}
      onConfirm={() => alert(`Confirmed ${typed}`)}
      onCancel={() => alert('Cancelled')}
      placeholder="main"
      icon={<LuGitBranch />}
      emptyText={`No branch matches “${typed}”`}
      footer="↑↓ navigate · ↵ switch · esc cancel"
      {...props}
    />
  );
};

export const Default: Story = {
  render: () => <FilteredAutocomplete />,
};

export const Loading: Story = {
  render: () => <FilteredAutocomplete items={[]} loading />,
};

export const LoadFailed: Story = {
  render: () => (
    <FilteredAutocomplete errorText="Couldn't load branches — you can still type a name" />
  ),
};

export const Busy: Story = {
  render: () => <FilteredAutocomplete busy />,
};
