import type { Meta, StoryObj } from '@storybook/react';
import { PMHeader } from './PMHeader';
import { HStack } from '@chakra-ui/react';
import { PMButton } from '../../form/PMButton/PMButton';

const meta: Meta<typeof PMHeader> = {
  title: 'Content/PMHeader',
  component: PMHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof PMHeader>;

// Default story
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Basic header with username displayed when user is logged in.',
      },
    },
  },
};

// Story with actions
export const WithActions: Story = {
  args: {
    actions: (
      <HStack gap={2}>
        <PMButton variant="primary" size="xs">
          Settings
        </PMButton>
        <PMButton variant="outline" size="xs">
          Sign Out
        </PMButton>
      </HStack>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Header with action buttons in the right side.',
      },
    },
  },
};
