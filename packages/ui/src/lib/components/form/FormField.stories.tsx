import type { Meta, StoryObj } from '@storybook/react';
import { Box, VStack } from '@chakra-ui/react';
import { PMInput } from './PMInput/PMInput';
import { PMLabel } from './PMLabel/PMLabel';

const FormFieldComponent = (props: {
  label: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const { label, required, placeholder, error, helperText, disabled, size } =
    props;
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <Box maxW="400px">
      <VStack align="stretch" gap={1}>
        <PMLabel htmlFor={inputId} required={required}>
          {label}
        </PMLabel>
        <PMInput
          id={inputId}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          disabled={disabled}
          size={size}
        />
        {helperText && !error && (
          <Box fontSize="xs" mt={1}>
            {helperText}
          </Box>
        )}
        {error && (
          <Box fontSize="xs" color="red.500" mt={1}>
            {error}
          </Box>
        )}
      </VStack>
    </Box>
  );
};

const meta: Meta<typeof FormFieldComponent> = {
  title: 'Form/FormField (Combined)',
  component: FormFieldComponent,
  argTypes: {
    label: { control: 'text', defaultValue: 'Email Address' },
    required: { control: 'boolean', defaultValue: false },
    placeholder: { control: 'text', defaultValue: 'Enter your email' },
    error: { control: 'text' },
    helperText: { control: 'text' },
    disabled: { control: 'boolean', defaultValue: false },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      defaultValue: 'md',
    },
  },
};
export default meta;

type Story = StoryObj<typeof FormFieldComponent>;

export const Default: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
  },
};

export const Required: Story = {
  args: {
    label: 'Email Address',
    required: true,
    placeholder: 'Enter your email',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Email Address',
    required: true,
    placeholder: 'Enter your email',
    helperText: 'We will never share your email with anyone',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    required: true,
    placeholder: 'Enter your email',
    error: 'Please enter a valid email address',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'This field is disabled',
    disabled: true,
  },
};

export const Large: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    size: 'lg',
  },
};

export const Small: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    size: 'sm',
  },
};
