import type { Meta, StoryObj } from '@storybook/react';
import { PMFormContainer } from './PMFormContainer';
import { PMInput } from '../PMInput/PMInput';
import { PMButton } from '../PMButton/PMButton';
import { PMLabel } from '../PMLabel/PMLabel';

const meta: Meta<typeof PMFormContainer> = {
  title: 'Form/PMFormContainer',
  component: PMFormContainer,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    maxWidth: { control: 'text' },
    spacing: { control: 'number' },
    padding: { control: 'text' },
    centered: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof PMFormContainer>;

export const Default: Story = {
  args: {
    maxWidth: '400px',
    spacing: 4,
    padding: 6,
    centered: true,
  },
  render: (args) => (
    <PMFormContainer {...args}>
      <PMLabel htmlFor="org-name" required>
        Organization Name
      </PMLabel>
      <PMInput id="org-name" placeholder="Enter organization name" />
      <PMButton>Create Organization</PMButton>
    </PMFormContainer>
  ),
};

export const Wide: Story = {
  args: {
    maxWidth: '600px',
    spacing: 6,
    padding: 8,
    centered: true,
  },
  render: (args) => (
    <PMFormContainer {...args}>
      <PMLabel htmlFor="org-name-wide" required>
        Organization Name
      </PMLabel>
      <PMInput id="org-name-wide" placeholder="Enter organization name" />
      <PMLabel htmlFor="org-desc">Description</PMLabel>
      <PMInput id="org-desc" placeholder="Enter description" />
      <PMButton>Create Organization</PMButton>
    </PMFormContainer>
  ),
};

export const Compact: Story = {
  args: {
    maxWidth: '300px',
    spacing: 2,
    padding: 4,
    centered: true,
  },
  render: (args) => (
    <PMFormContainer {...args}>
      <PMLabel htmlFor="email-compact">Email</PMLabel>
      <PMInput id="email-compact" placeholder="Email" />
      <PMLabel htmlFor="password-compact">Password</PMLabel>
      <PMInput id="password-compact" placeholder="Password" type="password" />
      <PMButton>Sign In</PMButton>
    </PMFormContainer>
  ),
};

export const NotCentered: Story = {
  args: {
    maxWidth: '400px',
    spacing: 4,
    padding: 6,
    centered: false,
  },
  render: (args) => (
    <PMFormContainer {...args}>
      <PMLabel htmlFor="text-input">Left-aligned form</PMLabel>
      <PMInput id="text-input" placeholder="Enter text" />
      <PMButton>Submit</PMButton>
    </PMFormContainer>
  ),
};
