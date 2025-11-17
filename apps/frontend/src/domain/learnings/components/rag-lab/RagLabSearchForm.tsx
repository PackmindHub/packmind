import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';

interface RagLabSearchFormProps {
  onSearch: (queryText: string, threshold: number) => void;
  isSearching: boolean;
}

export function RagLabSearchForm({
  onSearch,
  isSearching,
}: RagLabSearchFormProps) {
  const [queryText, setQueryText] = useState('');
  const threshold = 0.7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryText.trim()) {
      onSearch(queryText.trim(), threshold);
    }
  };

  return (
    <PMBox as="form" onSubmit={handleSubmit}>
      <PMVStack align="stretch" gap={4}>
        <PMVStack align="stretch" gap={2}>
          <PMText fontWeight="medium">Search Query</PMText>
          <PMInput
            placeholder="Enter a description or question about your standards and recipes..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            size="lg"
          />
          <PMText fontSize="sm">
            Search uses AI embeddings to find semantically similar content
          </PMText>
        </PMVStack>

        <PMButton
          type="submit"
          colorScheme="blue"
          size="lg"
          disabled={!queryText.trim() || isSearching}
          loading={isSearching}
        >
          Search
        </PMButton>
      </PMVStack>
    </PMBox>
  );
}
