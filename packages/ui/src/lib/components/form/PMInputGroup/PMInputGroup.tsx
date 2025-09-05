import { InputGroup, InputGroupProps } from '@chakra-ui/react';

export const PMInputGroup = (props: InputGroupProps) => {
  const { children, ...inputGroupProps } = props;

  return <InputGroup {...inputGroupProps}>{children}</InputGroup>;
};
