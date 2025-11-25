import type { Meta, StoryObj } from '@storybook/react';
import { PMButton } from './PMButton';

const meta: Meta<typeof PMButton> = {
  title: 'Form/PMButton',
  component: PMButton,
  argTypes: {
    children: { control: 'text', defaultValue: 'Bouton démo' },
    disabled: { control: 'boolean', defaultValue: false },
    loading: { control: 'boolean', defaultValue: false },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      defaultValue: 'md',
    },
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'tertiary',
        'outline',
        'danger',
        'success',
        'warning',
      ],
      defaultValue: 'primary',
    },
  },
};
export default meta;

type Story = StoryObj<typeof PMButton>;

export const Default: Story = {
  args: {
    children: 'Click me',
    size: 'md',
    variant: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    children: 'I am disabled',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    children: 'Click me',
    loading: true,
  },
};
