import * as React from 'react';
import { EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react';
import { PMText } from '../../typography/PMText';
import { PMHeading } from '../../typography/PMHeading';

export interface EmptyStateProps extends ChakraEmptyState.RootProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const PMEmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function PMEmptyState(props, ref) {
    const { title, description, icon, children, ...rest } = props;
    return (
      <ChakraEmptyState.Root ref={ref} {...rest}>
        <ChakraEmptyState.Content>
          {icon && (
            <ChakraEmptyState.Indicator>{icon}</ChakraEmptyState.Indicator>
          )}
          {description ? (
            <VStack textAlign="center">
              <ChakraEmptyState.Title asChild>
                <PMHeading level="h3">{title}</PMHeading>
              </ChakraEmptyState.Title>
              <ChakraEmptyState.Description asChild>
                <PMText>{description}</PMText>
              </ChakraEmptyState.Description>
            </VStack>
          ) : (
            <ChakraEmptyState.Title asChild>
              <PMHeading level="h3">{title}</PMHeading>
            </ChakraEmptyState.Title>
          )}
          {children}
        </ChakraEmptyState.Content>
      </ChakraEmptyState.Root>
    );
  },
);
