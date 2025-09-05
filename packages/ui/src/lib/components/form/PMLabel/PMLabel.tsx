import { Text, TextProps } from '@chakra-ui/react';

interface IPMLabelProps extends Omit<TextProps, 'htmlFor'> {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}

export const PMLabel = (props: IPMLabelProps) => {
  const { children, required, htmlFor, ...textProps } = props;

  return (
    <Text
      as="label"
      {...textProps}
      fontSize="sm"
      fontWeight="medium"
      color="text.secondary"
      mb={1}
      display="block"
      {...(htmlFor && { htmlFor })}
    >
      {children}
      {required && (
        <Text as="span" color="red.500" ml={1}>
          *
        </Text>
      )}
    </Text>
  );
};
