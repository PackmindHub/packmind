import type { Meta, StoryObj } from '@storybook/react';
import { PMConfirmationModal } from './PMConfirmationModal';
import { PMButton } from '../../form/PMButton/PMButton';
import { useState } from 'react';

const meta = {
  title: 'Feedback/PMConfirmationModal',
  component: PMConfirmationModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PMConfirmationModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: <PMButton colorScheme="red">Delete Item</PMButton>,
    title: 'Delete Item',
    message:
      'Are you sure you want to delete this item? This action cannot be undone.',
    onConfirm: () => {
      console.log('Item deleted!');
    },
  },
};

export const CustomTexts: Story = {
  args: {
    trigger: <PMButton colorScheme="orange">Remove User</PMButton>,
    title: 'Remove User',
    message:
      'This will permanently remove the user from your organization. They will lose access to all resources.',
    confirmText: 'Remove',
    cancelText: 'Keep User',
    confirmColorScheme: 'orange',
    onConfirm: () => {
      console.log('User removed!');
    },
  },
};

const WithLoadingComponent = (args: typeof Default.args) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate async operation
    setTimeout(() => {
      setIsLoading(false);
      setIsOpen(false);
      console.log('Action completed!');
    }, 2000);
  };

  return (
    <PMConfirmationModal
      {...args}
      open={isOpen}
      onOpenChange={setIsOpen}
      isLoading={isLoading}
      onConfirm={handleConfirm}
    />
  );
};

export const WithLoading: Story = {
  render: WithLoadingComponent,
  args: {
    trigger: <PMButton colorScheme="red">Delete with Loading</PMButton>,
    title: 'Delete Item',
    message: 'This will take a moment to complete. Please wait...',
    confirmText: 'Delete',
  },
};

export const LongMessage: Story = {
  args: {
    trigger: <PMButton colorScheme="red">Delete Account</PMButton>,
    title: 'Delete Account',
    message:
      'This action will permanently delete your account and all associated data. This includes all your projects, files, settings, and any other information stored in your account. This action cannot be undone and you will not be able to recover your data after deletion. Please make sure you have backed up any important information before proceeding.',
    confirmText: 'Delete Account',
    confirmColorScheme: 'red',
    onConfirm: () => {
      console.log('Account deleted!');
    },
  },
};
