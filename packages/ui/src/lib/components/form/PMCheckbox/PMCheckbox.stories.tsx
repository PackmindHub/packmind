import type { Meta, StoryObj } from '@storybook/react';
import React, { ChangeEvent, useState } from 'react';
import { PMCheckbox } from './PMCheckbox';

const meta: Meta<typeof PMCheckbox> = {
  title: 'Form/PMCheckbox',
  component: PMCheckbox,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PMCheckbox>;

export const Default: Story = {
  args: {
    'aria-label': 'Default Checkbox',
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    'aria-label': 'Checked Checkbox',
    readOnly: true,
  },
};

const ControlledCheckbox = (args: StoryObj<typeof PMCheckbox>['args']) => {
  const [checked, setChecked] = useState(false);
  return (
    <PMCheckbox
      {...args}
      checked={checked}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        setChecked(e.target.checked)
      }
      aria-label="Controlled Checkbox"
    />
  );
};

export const Controlled: Story = {
  render: (args) => <ControlledCheckbox {...args} />,
};
