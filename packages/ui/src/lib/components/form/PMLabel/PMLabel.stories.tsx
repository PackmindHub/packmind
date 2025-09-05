import type { Meta, StoryObj } from '@storybook/react';
import { PMLabel } from './PMLabel';

const meta: Meta<typeof PMLabel> = {
  title: 'Form/PMLabel',
  component: PMLabel,
  argTypes: {
    children: { control: 'text', defaultValue: 'Label text' },
    required: { control: 'boolean', defaultValue: false },
    htmlFor: { control: 'text' },
    fontSize: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      defaultValue: 'sm',
    },
    fontWeight: {
      control: 'select',
      options: ['normal', 'medium', 'semibold', 'bold'],
      defaultValue: 'medium',
    },
    color: { control: 'text', defaultValue: 'gray.700' },
  },
};
export default meta;

type Story = StoryObj<typeof PMLabel>;

export const Default: Story = {
  args: {
    children: 'Email Address',
  },
};

export const Required: Story = {
  args: {
    children: 'Email Address',
    required: true,
  },
};

export const WithHtmlFor: Story = {
  args: {
    children: 'Email Address',
    htmlFor: 'email-input',
    required: true,
  },
};

export const LargeLabel: Story = {
  args: {
    children: 'Large Label',
    fontSize: 'lg',
    fontWeight: 'bold',
  },
};

export const SmallLabel: Story = {
  args: {
    children: 'Small Label',
    fontSize: 'xs',
    fontWeight: 'normal',
  },
};

export const CustomColor: Story = {
  args: {
    children: 'Custom Color Label',
    color: 'purple.600',
    required: true,
  },
};
