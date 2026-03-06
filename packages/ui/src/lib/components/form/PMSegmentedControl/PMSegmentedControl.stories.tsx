import type { Meta, StoryObj } from '@storybook/react';
import { Box, HStack, VStack } from '@chakra-ui/react';
import { PMSegmentGroup } from './PMSegmentedControl';
import { PMButton } from '../PMButton/PMButton';

const meta: Meta<typeof PMSegmentGroup.Root> = {
  title: 'Form/PMSegmentedControl',
  component: PMSegmentGroup.Root,
  argTypes: {},
};
export default meta;

type Story = StoryObj<typeof PMSegmentGroup.Root>;

const defaultItems = [
  { label: 'Diff', value: 'diff' },
  { label: 'Inline', value: 'inline' },
];

const multiItems = [
  { label: 'All', value: 'all' },
  { label: 'Commands', value: 'commands' },
  { label: 'Standards', value: 'standards' },
  { label: 'Skills', value: 'skills' },
];

const WithButton = ({
  size,
  items,
  defaultValue,
}: {
  size: 'sm' | 'md' | 'lg';
  items: { label: string; value: string }[];
  defaultValue: string;
}) => (
  <HStack gap="3" alignItems="center">
    <PMSegmentGroup.Root size={size} defaultValue={defaultValue}>
      <PMSegmentGroup.Indicator />
      <PMSegmentGroup.Items items={items} />
    </PMSegmentGroup.Root>
    <PMButton size={size} variant="primary">
      Focused
    </PMButton>
  </HStack>
);

export const Small: Story = {
  render: () => (
    <WithButton size="sm" items={defaultItems} defaultValue="diff" />
  ),
};

export const Medium: Story = {
  render: () => (
    <WithButton size="md" items={defaultItems} defaultValue="diff" />
  ),
};

export const Large: Story = {
  render: () => (
    <WithButton size="lg" items={defaultItems} defaultValue="diff" />
  ),
};

export const AllSizes: Story = {
  render: () => (
    <VStack gap="6" alignItems="flex-start">
      <WithButton size="sm" items={defaultItems} defaultValue="diff" />
      <WithButton size="md" items={defaultItems} defaultValue="diff" />
      <WithButton size="lg" items={defaultItems} defaultValue="diff" />
    </VStack>
  ),
};

export const MultipleItems: Story = {
  render: () => <WithButton size="md" items={multiItems} defaultValue="all" />,
};
