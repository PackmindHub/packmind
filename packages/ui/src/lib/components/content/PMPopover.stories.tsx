import type { Meta, StoryObj } from '@storybook/react';
import { PMPopover } from './PMPopover';
import { PMButton } from '../form/PMButton/PMButton';
import { Box, VStack, HStack, Text, Button } from '@chakra-ui/react';

const meta: Meta<typeof PMPopover> = {
  title: 'Content/PMPopover',
  component: PMPopover,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'PMPopover is a simple popover component that displays content when triggered by clicking on a trigger element.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'The trigger element for the popover',
      control: false,
    },
    content: {
      description: 'The content to display in the popover',
      control: false,
    },
    placement: {
      description: 'Where to position the popover relative to the trigger',
      control: 'select',
      options: ['top', 'bottom', 'left', 'right', 'bottom-start', 'bottom-end'],
    },
    showArrow: {
      description: 'Whether to show an arrow pointing to the trigger',
      control: 'boolean',
    },
    disabled: {
      description: 'Whether the popover is disabled',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic usage story
export const Default: Story = {
  args: {
    content: (
      <Box p={4}>
        <Text>This is the popover content</Text>
      </Box>
    ),
    children: <PMButton>Click me</PMButton>,
    placement: 'bottom',
    showArrow: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic popover with simple text content.',
      },
    },
  },
};

// With arrow
export const WithArrow: Story = {
  args: {
    content: (
      <Box p={4}>
        <Text>This popover has an arrow pointing to the trigger</Text>
      </Box>
    ),
    children: <PMButton>Click me</PMButton>,
    placement: 'bottom',
    showArrow: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Popover with an arrow pointing to the trigger element.',
      },
    },
  },
};

// Different placements
export const Placements: Story = {
  render: () => (
    <VStack gap={6}>
      <HStack gap={4}>
        <PMPopover
          content={
            <Box p={3}>
              <Text>Top placement</Text>
            </Box>
          }
          placement="top"
          showArrow
        >
          <PMButton>Top</PMButton>
        </PMPopover>
        <PMPopover
          content={
            <Box p={3}>
              <Text>Bottom placement</Text>
            </Box>
          }
          placement="bottom"
          showArrow
        >
          <PMButton>Bottom</PMButton>
        </PMPopover>
        <PMPopover
          content={
            <Box p={3}>
              <Text>Left placement</Text>
            </Box>
          }
          placement="left"
          showArrow
        >
          <PMButton>Left</PMButton>
        </PMPopover>
        <PMPopover
          content={
            <Box p={3}>
              <Text>Right placement</Text>
            </Box>
          }
          placement="right"
          showArrow
        >
          <PMButton>Right</PMButton>
        </PMPopover>
      </HStack>
    </VStack>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'PMPopover supports different placements relative to the trigger element.',
      },
    },
  },
};

// Rich content example (like the DeployRecipeButton use case)
export const RichContent: Story = {
  args: {
    content: (
      <Box p={4} w="280px">
        <Text fontWeight="bold" mb={3}>
          Repository Options
        </Text>
        <VStack align="stretch" gap={2}>
          <Button variant="ghost" size="sm" textAlign="left">
            <span role="img" aria-label="folder">
              📁
            </span>{' '}
            Main Repository
          </Button>
          <Button variant="ghost" size="sm" textAlign="left">
            <span role="img" aria-label="folder">
              📁
            </span>{' '}
            Staging Repository
          </Button>
          <Button variant="ghost" size="sm" textAlign="left">
            <span role="img" aria-label="folder">
              📁
            </span>{' '}
            Development Repository
          </Button>
          <Button colorScheme="blue" size="sm" mt={2}>
            Deploy to All
          </Button>
        </VStack>
      </Box>
    ),
    children: <PMButton>Deploy</PMButton>,
    placement: 'bottom-start',
    showArrow: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'PMPopover can contain rich interactive content like buttons and forms.',
      },
    },
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    content: (
      <Box p={4}>
        <Text>This content will not be shown</Text>
      </Box>
    ),
    children: <PMButton>Disabled popover</PMButton>,
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When disabled, the popover will not show and only renders the trigger children.',
      },
    },
  },
};
