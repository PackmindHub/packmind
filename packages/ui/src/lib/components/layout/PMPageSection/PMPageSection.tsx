import {
  Box,
  BoxProps,
  ButtonGroup,
  HStack,
  VStack,
  Collapsible,
  CollapsibleRootProps,
  useCollapsibleContext,
} from '@chakra-ui/react';
import { PMHeading } from '../../typography/PMHeading';
import { ComponentPropsWithoutRef } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

interface PMBoxProps extends ComponentPropsWithoutRef<'div'> {
  title?: string;
  cta?: React.ReactNode;
  variant?: 'plain' | 'outline';
  backgroundColor?: 'primary' | 'secondary' | 'tertiary';
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  boxProps?: BoxProps;
  children: React.ReactNode;
  collapsible?: boolean;
  collapsibleProps?: CollapsibleRootProps;
}

const CollapsibleIcon = () => {
  const { open } = useCollapsibleContext();
  return open ? <LuChevronUp /> : <LuChevronDown />;
};

const PMPageSection = ({
  title,
  cta,
  variant = 'plain',
  backgroundColor = 'secondary',
  headingLevel = 'h3',
  boxProps,
  children,
  collapsible = false,
  collapsibleProps,
}: PMBoxProps) => {
  const boxCustomProps = {
    padding: '4',
    border: '1px solid',
    borderColor:
      variant === 'plain' ? 'transparent' : '{colors.border.secondary}',
    borderRadius: 'md',
    ...boxProps,
  };

  const headerContent = (
    <HStack justify={'space-between'} width="full">
      <PMHeading level={headingLevel} mb={2}>
        {title}
      </PMHeading>
      <HStack gap={2}>
        {cta && <ButtonGroup>{cta}</ButtonGroup>}
        {collapsible && <CollapsibleIcon />}
      </HStack>
    </HStack>
  );

  const contentElement = <VStack alignItems={'flex-start'}>{children}</VStack>;

  if (collapsible) {
    return (
      <Box
        p={4}
        backgroundColor={`{colors.background.${backgroundColor}}`}
        {...boxCustomProps}
      >
        <Collapsible.Root {...collapsibleProps}>
          <Collapsible.Trigger width="full" textAlign="left" cursor="pointer">
            {headerContent}
          </Collapsible.Trigger>
          <Collapsible.Content>{contentElement}</Collapsible.Content>
        </Collapsible.Root>
      </Box>
    );
  }

  return (
    <Box
      p={4}
      backgroundColor={`{colors.background.${backgroundColor}}`}
      {...boxCustomProps}
    >
      {headerContent}
      {contentElement}
    </Box>
  );
};

export { PMPageSection };
