import type { Meta, StoryObj } from '@storybook/react';
import { PMInput } from './PMInput';

const meta: Meta<typeof PMInput> = {
  title: 'Form/PMInput',
  component: PMInput,
  argTypes: {
    placeholder: { control: 'text', defaultValue: 'Enter text...' },
    disabled: { control: 'boolean', defaultValue: false },
    error: { control: 'text' },
    helperText: { control: 'text' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      defaultValue: 'md',
    },
    variant: {
      control: 'select',
      options: ['outline', 'filled', 'flushed', 'unstyled'],
      defaultValue: 'outline',
    },
  },
};
export default meta;

type Story = StoryObj<typeof PMInput>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    size: 'md',
    variant: 'outline',
  },
};

export const WithError: Story = {
  args: {
    placeholder: 'Enter text...',
    error: 'This field is required',
    value: 'Invalid input',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'This input is disabled',
    disabled: true,
  },
};

export const WithHelperText: Story = {
  args: {
    placeholder: 'Enter your email',
    helperText: 'We will never share your email',
  },
};

export const Large: Story = {
  args: {
    placeholder: 'Large input',
    size: 'lg',
  },
};

export const Small: Story = {
  args: {
    placeholder: 'Small input',
    size: 'sm',
  },
};
