import React from 'react';
import {
  PMBox,
  PMVStack,
  PMSpinner,
  PMText,
  PMEmptyState,
  PMTableRow,
} from '@packmind/ui';
import { AnalyticsTable } from './AnalyticsTable';

type AnalyticsContentProps = {
  tableData: PMTableRow[];
  isLoading: boolean;
  isError: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  loadingMessage?: string;
  errorMessage?: string;
};

export const AnalyticsContent: React.FC<AnalyticsContentProps> = ({
  tableData,
  isLoading,
  isError,
  emptyStateTitle,
  emptyStateDescription,
  loadingMessage = 'Loading analytics...',
  errorMessage = 'Error loading analytics.',
}) => {
  if (isLoading) {
    return (
      <PMBox display="flex" justifyContent="center" py={8}>
        <PMVStack gap={4}>
          <PMSpinner size="lg" />
          <PMText>{loadingMessage}</PMText>
        </PMVStack>
      </PMBox>
    );
  }

  if (isError) {
    return (
      <PMBox display="flex" justifyContent="center" py={8}>
        <PMText color="error">{errorMessage}</PMText>
      </PMBox>
    );
  }

  if (emptyStateTitle && emptyStateDescription) {
    return (
      <PMEmptyState
        title={emptyStateTitle}
        description={emptyStateDescription}
      />
    );
  }

  return <AnalyticsTable data={tableData} />;
};
