import { Box, BoxProps, ButtonGroup, HStack, VStack } from '@chakra-ui/react';
import { PMHeading } from '../../typography/PMHeading';
import { ComponentPropsWithoutRef } from 'react';

interface PMBoxProps extends ComponentPropsWithoutRef<'div'> {
  title?: string;
  cta?: React.ReactNode;
  variant?: 'plain' | 'outline';
  backgroundColor?: 'primary' | 'secondary' | 'tertiary';
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  boxProps?: BoxProps;
  children: React.ReactNode;
}

const PMPageSection = ({
  title,
  cta,
  variant = 'plain',
  backgroundColor = 'secondary',
  headingLevel = 'h3',
  boxProps,
  children,
}: PMBoxProps) => {
  const boxCustomProps = {
    padding: '4',
    border: '1px solid',
    borderColor:
      variant === 'plain' ? 'transparent' : '{colors.border.secondary}',
    borderRadius: 'md',
    ...boxProps,
  };

  return (
    <Box
      p={4}
      backgroundColor={`{colors.background.${backgroundColor}}`}
      {...boxCustomProps}
    >
      <HStack justify={'space-between'}>
        <PMHeading level={headingLevel} mb={2}>
          {title}
        </PMHeading>
        {cta && <ButtonGroup>{cta}</ButtonGroup>}
      </HStack>
      <VStack alignItems={'flex-start'}>{children}</VStack>
    </Box>
  );
};

export { PMPageSection };
