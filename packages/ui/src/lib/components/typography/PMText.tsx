import { Text, TextProps } from '@chakra-ui/react';

export interface PMTextProps extends TextProps {
  as?: 'span' | 'p' | 'div';
  variant?: 'body' | 'body-important' | 'small' | 'small-important';
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'faded';
  children: React.ReactNode;
}

export function PMText({
  as = 'span',
  variant = 'body',
  color = 'primary',
  children,
  ...rest
}: PMTextProps) {
  return (
    <Text
      as={as}
      textStyle={variant}
      {...rest}
      color={`{colors.text.${color}}`}
    >
      {children}
    </Text>
  );
}
