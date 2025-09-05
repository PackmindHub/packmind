import type { Meta, StoryObj } from '@storybook/react';
import { PMBadge } from './PMBadge';

const meta: Meta<typeof PMBadge> = {
  title: 'Content/PMBadge',
  component: PMBadge,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof PMBadge>;

export const Default: Story = {
  args: {
    children: 'Nouveau',
    colorScheme: 'green',
    variant: 'solid',
  },
};

export const Outline: Story = {
  args: {
    children: 'Info',
    colorScheme: 'blue',
    variant: 'outline',
  },
};
