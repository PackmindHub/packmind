import React from 'react';
import { Box, Flex, VStack } from '@chakra-ui/react';
import { PMHeading } from '../../typography/PMHeading';
import { PMText } from '../../typography/PMText';
import { PMGrid, PMGridItem, PMHeader } from '../../layout';

export interface IPMPageProps {
  title?: string;
  titleLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  subtitle?: string;
  breadcrumbComponent?: React.ReactNode;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  isFullWidth?: boolean;
}

export const PMPage: React.FC<IPMPageProps> = ({
  title,
  titleLevel = 'h1',
  subtitle,
  breadcrumbComponent,
  actions,
  sidebar,
  children,
  maxWidth = '1200px',
  isFullWidth = false,
}) => {
  const renderHeader = () => (
    <Box mb={4}>
      <Flex
        justify="space-between"
        align="start"
        gap={4}
        direction={{ base: 'column', md: 'row' }}
      >
        <VStack align="stretch" gap={1} flex={1}>
          <PMHeading level={titleLevel}>{title}</PMHeading>
          {subtitle && <PMText variant="body">{subtitle}</PMText>}
        </VStack>
        {actions && <Box flexShrink={0}>{actions}</Box>}
      </Flex>
    </Box>
  );

  const renderContent = () => {
    if (sidebar) {
      return (
        <Flex
          gap={6}
          direction={{ base: 'column', lg: 'row' }}
          flex={1}
          maxH={'100%'}
        >
          <Box flex={1}>{children}</Box>
          <Box width={{ base: '100%', lg: '300px' }} flexShrink={0}>
            {sidebar}
          </Box>
        </Flex>
      );
    }

    return <Box>{children}</Box>;
  };

  return (
    <PMGrid
      maxH={'100%'}
      height={'100%'}
      overflow={'hidden'}
      templateRows={`${breadcrumbComponent ? '44px' : ''} 1fr`}
    >
      {breadcrumbComponent && (
        <PMGridItem>
          <PMHeader color="secondary">{breadcrumbComponent}</PMHeader>
        </PMGridItem>
      )}
      <PMGridItem overflow={'auto'}>
        <VStack
          align="stretch"
          gap={6}
          maxWidth={isFullWidth ? '100%' : maxWidth}
          mx={isFullWidth ? 0 : 'auto'}
          px={6}
          py={4}
        >
          {renderHeader()}
          {renderContent()}
        </VStack>
      </PMGridItem>
    </PMGrid>
  );
};
