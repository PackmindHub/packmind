import { Textarea, TextareaProps } from '@chakra-ui/react';

export const PMTextArea = (props: TextareaProps) => {
  return (
    <Textarea
      {...props}
      backgroundColor={'{colors.background.tertiary}'}
      borderColor={'transparent'}
      _placeholder={{ color: '{colors.text.faded}' }}
      _invalid={{
        borderColor: 'red.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
      }}
    />
  );
};

export type IPMTextAreaProps = TextareaProps;
