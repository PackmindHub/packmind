import React from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { PMButton, PMHStack, PMIcon, PMText } from '@packmind/ui';

interface SpacesPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export const SpacesPagination: React.FC<SpacesPaginationProps> = ({
  page,
  pageSize,
  totalCount,
  onPageChange,
}) => {
  if (totalCount <= pageSize) {
    return null;
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <PMHStack
      as="nav"
      aria-label="Spaces pagination"
      justify="space-between"
      align="center"
      width="full"
    >
      <PMText color="faded" fontSize="sm">
        Showing {start}–{end} of {totalCount}
      </PMText>
      <PMHStack gap={1}>
        <PMButton
          variant="secondary"
          size="sm"
          aria-label="Previous page"
          disabled={isFirstPage}
          onClick={() => onPageChange(page - 1)}
        >
          <PMIcon>
            <LuChevronLeft />
          </PMIcon>
        </PMButton>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
          (pageNumber) => (
            <PMButton
              key={pageNumber}
              variant={pageNumber === page ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPageChange(pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={pageNumber === page ? 'page' : undefined}
            >
              {pageNumber}
            </PMButton>
          ),
        )}
        <PMButton
          variant="secondary"
          size="sm"
          aria-label="Next page"
          disabled={isLastPage}
          onClick={() => onPageChange(page + 1)}
        >
          <PMIcon>
            <LuChevronRight />
          </PMIcon>
        </PMButton>
      </PMHStack>
    </PMHStack>
  );
};
