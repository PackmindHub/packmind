import { Heading, HeadingProps } from '@chakra-ui/react';

export type PMHeadingProps = {
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  color?: 'primary' | 'secondary' | 'tertiary' | 'faded';
  children: React.ReactNode;
} & HeadingProps;

export function PMHeading({
  children,
  color = 'primary',
  level = 'h1',
  ...rest
}: PMHeadingProps) {
  return (
    <Heading as={level} size={level} {...rest} color={`{colors.text.${color}}`}>
      {children}
    </Heading>
  );
}
