import { Heading, HeadingProps } from '@chakra-ui/react';

export type PMHeadingProps = {
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  color?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'faded'
    | 'primaryLight'
    | 'secondaryLight'
    | 'tertiaryLight';
  children: React.ReactNode;
  headingProps?: HeadingProps;
} & HeadingProps;

export function PMHeading({
  children,
  color = 'primary',
  level = 'h1',
  headingProps,
  ...rest
}: PMHeadingProps) {
  return (
    <Heading
      as={level}
      size={level}
      {...rest}
      color={`{colors.text.${color}}`}
      {...headingProps}
    >
      {children}
    </Heading>
  );
}
