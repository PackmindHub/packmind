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
  let boxCustomProps = {};

  if (variant === 'outline') {
    boxCustomProps = {
      padding: '4',
      border: '1px solid',
      borderColor: '{colors.border.primary}',
      borderRadius: 'md',
      ...boxProps,
    };
  }

  return (
    <Box
      {...boxCustomProps}
      backgroundColor={`{colors.background.${backgroundColor}}`}
      p={4}
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
