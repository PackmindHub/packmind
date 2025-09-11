import { Input, InputProps } from '@chakra-ui/react';

const DEFAULT_MAX_LENGTH = 255;

export interface IPMInputProps extends InputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PMInput = (props: IPMInputProps) => {
  const {
    label,
    error,
    helperText,
    maxLength = DEFAULT_MAX_LENGTH,
    ...inputProps
  } = props;

  return (
    <Input
      {...inputProps}
      maxLength={maxLength}
      backgroundColor={'{colors.background.tertiary}'}
      borderColor={error ? 'red.500' : 'transparent'}
      _placeholder={{ color: '{colors.text.faded}' }}
      _hover={{
        borderColor: error ? 'red.500' : 'transparent',
      }}
      _focus={{
        borderColor: error && 'red.500',
        boxShadow: error && '0 0 0 1px var(--chakra-colors-red-500)',
      }}
      _invalid={{
        borderColor: 'red.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
      }}
    />
  );
};
