import React from 'react';
import { VStack, Container } from '@chakra-ui/react';

export interface IPMFormContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
  spacing?: number;
  padding?: string | number;
  centered?: boolean;
  className?: string;
}

export const PMFormContainer: React.FC<IPMFormContainerProps> = ({
  children,
  maxWidth = '400px',
  spacing = 4,
  padding = 6,
  centered = true,
  className,
}) => {
  return (
    <Container
      maxW={maxWidth}
      centerContent={centered}
      p={padding}
      className={className}
    >
      <VStack gap={spacing} align="stretch" w="full">
        {children}
      </VStack>
    </Container>
  );
};
