import React from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { PMButton, PMHStack, PMIcon, PMText } from '@packmind/ui';

interface SpacesPaginationProps {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

export const SpacesPagination: React.FC<SpacesPaginationProps> = ({
  totalCount,
  pageSize,
  currentPage,
  totalPages,
}) => {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <PMHStack justify="space-between" align="center" width="full">
      <PMText color="faded" fontSize="sm">
        Showing {start}–{end} of {totalCount}
      </PMText>
      <PMHStack gap={1}>
        <PMButton
          variant="secondary"
          size="sm"
          aria-label="Previous page"
          onClick={() => undefined}
        >
          <PMIcon>
            <LuChevronLeft />
          </PMIcon>
        </PMButton>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <PMButton
            key={page}
            variant={page === currentPage ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => undefined}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </PMButton>
        ))}
        <PMButton
          variant="secondary"
          size="sm"
          aria-label="Next page"
          onClick={() => undefined}
        >
          <PMIcon>
            <LuChevronRight />
          </PMIcon>
        </PMButton>
      </PMHStack>
    </PMHStack>
  );
};
