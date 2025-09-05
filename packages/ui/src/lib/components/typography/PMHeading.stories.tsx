import type { Meta, StoryObj } from '@storybook/react';
import { PMHeading } from './PMHeading';

const meta: Meta<typeof PMHeading> = {
  title: 'Typography/PMHeading',
  component: PMHeading,
  argTypes: {
    level: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      defaultValue: 'h1',
    },
    children: {
      control: 'text',
      defaultValue: 'Demo title',
    },
  },
};
export default meta;

type Story = StoryObj<typeof PMHeading>;

export const Default: Story = {
  args: {
    level: 'h1',
    children: 'Demo title',
  },
};

export const AllLevels: Story = {
  render: (args) => (
    <>
      <PMHeading level="h1">Titre H1</PMHeading>
      <PMHeading level="h2">Titre H2</PMHeading>
      <PMHeading level="h3">Titre H3</PMHeading>
      <PMHeading level="h4">Titre H4</PMHeading>
      <PMHeading level="h5">Titre H5</PMHeading>
      <PMHeading level="h6">Titre H6</PMHeading>
    </>
  ),
};
