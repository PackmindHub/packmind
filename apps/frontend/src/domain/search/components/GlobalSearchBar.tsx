import { useEffect, useState } from 'react';
import {
  PMBox,
  PMEmptyState,
  PMInputGroup,
  PMInput,
  PMPopover,
  PMSkeleton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuSearch } from 'react-icons/lu';
import { useSearchQuery } from '../api/queries/SearchQueries';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { SearchResultRow } from './SearchResultRow';

const MIN_TERM_LENGTH = 2;
const DEBOUNCE_DELAY = 250;
const DROPDOWN_WIDTH = '380px';
const LOADING_SKELETONS = 4;

/**
 * Global search bar rendered in the top navbar. Typing at least
 * `MIN_TERM_LENGTH` characters (after a short debounce) queries the org-scoped
 * search endpoint and displays up to 15 results in a dropdown, with the
 * searched term highlighted in each result's name and description.
 *
 * The dropdown is anchored (not triggered) to the input, so clicking into the
 * input to refine the query never closes it; it closes on Escape / outside
 * click (via the popover) or when the term drops below the threshold.
 */
export const GlobalSearchBar = () => {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedTerm = useDebouncedValue(term, DEBOUNCE_DELAY);

  const trimmed = debouncedTerm.trim();
  const enabled = trimmed.length >= MIN_TERM_LENGTH;

  const { data, isFetching, isLoading } = useSearchQuery(
    enabled ? trimmed : '',
  );

  // Open while the debounced term qualifies, close when it drops below the
  // threshold. Re-evaluates on every debounced change so refining the query
  // reopens the dropdown after an outside-click dismissal.
  useEffect(() => {
    setOpen(enabled);
  }, [enabled, trimmed]);

  const results = data?.results ?? [];
  const showLoading = enabled && (isLoading || isFetching);
  const showResults = enabled && !isLoading && !isFetching;
  const showEmpty = showResults && results.length === 0;

  const handleSelect = () => {
    setTerm('');
    setOpen(false);
  };

  return (
    <PMPopover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{ placement: 'bottom-start' }}
    >
      <PMPopover.Anchor asChild>
        <PMInputGroup
          startElement={<LuSearch />}
          width={DROPDOWN_WIDTH}
          data-testid="global-search-input-group"
        >
          <PMInput
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search standards, commands, skills, packages…"
            aria-label="Search artifacts"
            role="searchbox"
          />
        </PMInputGroup>
      </PMPopover.Anchor>
      {enabled ? (
        <PMPopover.Positioner>
          <PMPopover.Content
            width={DROPDOWN_WIDTH}
            p={0}
            backgroundColor="{colors.background.secondary}"
            borderColor="{colors.border.tertiary}"
            borderWidth="1px"
            boxShadow="md"
          >
            {showLoading ? (
              <PMVStack gap={2} p={3} align="stretch">
                {Array.from({ length: LOADING_SKELETONS }).map((_, index) => (
                  <PMSkeleton key={index} height="24px" />
                ))}
              </PMVStack>
            ) : showEmpty ? (
              <PMBox p={4}>
                <PMEmptyState
                  title="No results"
                  description={`No artifacts match "${debouncedTerm}".`}
                />
              </PMBox>
            ) : showResults ? (
              <PMVStack gap={0} align="stretch" maxH="400px" overflowY="auto">
                {results.map((result) => (
                  <SearchResultRow
                    key={`${result.type}:${result.id}`}
                    result={result}
                    term={trimmed}
                    onSelect={handleSelect}
                  />
                ))}
                <PMBox
                  borderTopWidth="1px"
                  borderColor="{colors.border.tertiary}"
                  px={3}
                  py={1}
                >
                  <PMText variant="small" color="faded">
                    {results.length} result{results.length > 1 ? 's' : ''}
                  </PMText>
                </PMBox>
              </PMVStack>
            ) : null}
          </PMPopover.Content>
        </PMPopover.Positioner>
      ) : null}
    </PMPopover.Root>
  );
};
