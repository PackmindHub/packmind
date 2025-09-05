import type { Meta, StoryObj } from '@storybook/react';
import { Field, Stack } from '@chakra-ui/react';
import { PMTextArea } from './PMTextArea';

const meta: Meta<typeof PMTextArea> = {
  title: 'Form/PMTextArea',
  component: PMTextArea,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      defaultValue: 'Enter your message...',
    },
    disabled: {
      control: 'boolean',
      defaultValue: false,
    },
    error: {
      control: 'text',
    },
    helperText: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      defaultValue: 'md',
    },
    variant: {
      control: 'select',
      options: ['outline', 'subtle', 'flushed'],
      defaultValue: 'outline',
    },
    resize: {
      control: 'select',
      options: ['none', 'both', 'horizontal', 'vertical'],
      defaultValue: 'vertical',
    },
    autoresize: {
      control: 'boolean',
      defaultValue: false,
    },
    maxRows: {
      control: 'number',
      defaultValue: undefined,
    },
  },
};

export default meta;
type Story = StoryObj<typeof PMTextArea>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
    size: 'md',
    variant: 'outline',
  },
};

export const WithError: Story = {
  args: {
    placeholder: 'Enter your comment...',
    error: 'This field is required',
    value: 'Invalid input that triggered an error',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the textarea with error styling and red border.',
      },
    },
  },
};

export const WithHelperText: Story = {
  args: {
    placeholder: 'Share your thoughts...',
    helperText: 'Maximum 500 characters allowed',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the textarea with helpful guidance text below.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'This textarea is disabled',
    disabled: true,
    value: 'You cannot edit this content',
  },
};

export const Variants: Story = {
  render: () => (
    <Stack gap="4">
      <PMTextArea variant="outline" placeholder="Outline variant" />
      <PMTextArea variant="subtle" placeholder="Subtle variant" />
      <PMTextArea variant="flushed" placeholder="Flushed variant" />
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows all available visual variants of the textarea.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="4">
      <PMTextArea size="xs" placeholder="XSmall size" />
      <PMTextArea size="sm" placeholder="Small size" />
      <PMTextArea size="md" placeholder="Medium size" />
      <PMTextArea size="lg" placeholder="Large size" />
      <PMTextArea size="xl" placeholder="XLarge size" />
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows all available sizes of the textarea.',
      },
    },
  },
};

export const ResizeBehavior: Story = {
  render: () => (
    <Stack gap="4" maxWidth="400px">
      <Stack>
        <PMTextArea
          resize="none"
          placeholder="No resize (resize: none)"
          rows={3}
        />
      </Stack>
      <Stack>
        <PMTextArea
          resize="vertical"
          placeholder="Vertical resize only (resize: vertical)"
          rows={3}
        />
      </Stack>
      <Stack>
        <PMTextArea
          resize="horizontal"
          placeholder="Horizontal resize only (resize: horizontal)"
          rows={3}
        />
      </Stack>
      <Stack>
        <PMTextArea
          resize="both"
          placeholder="Both directions (resize: both)"
          rows={3}
        />
      </Stack>
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates different resize behaviors. Try dragging the resize handles on each textarea.',
      },
    },
  },
};

export const Autoresize: Story = {
  args: {
    autoresize: true,
    placeholder: 'Start typing and this textarea will grow automatically...',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The textarea automatically expands vertically as you type more content.',
      },
    },
  },
};

export const AutoresizeWithMaxRows: Story = {
  args: {
    autoresize: true,
    maxRows: 5,
    placeholder: 'This textarea will grow up to 5 rows maximum, then scroll...',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Combines autoresize with a maximum row limit. After 5 rows, it will scroll instead of growing.',
      },
    },
  },
};

export const WithFieldComponent: Story = {
  render: () => (
    <Stack gap="6" width="full" maxWidth="500px">
      <Field.Root required>
        <Field.Label>
          Message <Field.RequiredIndicator />
        </Field.Label>
        <PMTextArea placeholder="Enter your message..." variant="subtle" />
        <Field.HelperText>Maximum 500 characters.</Field.HelperText>
      </Field.Root>

      <Field.Root invalid>
        <Field.Label>
          Comment <Field.RequiredIndicator />
        </Field.Label>
        <PMTextArea
          placeholder="Enter your comment..."
          variant="outline"
          error="This field is required"
        />
        <Field.ErrorText>This field is required</Field.ErrorText>
      </Field.Root>
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows how PMTextArea integrates with Chakra UI Field components for labels, helper text, and error states.',
      },
    },
  },
};

export const LongContent: Story = {
  args: {
    value: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`,
    rows: 6,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows how the textarea handles longer content with proper scrolling.',
      },
    },
  },
};
