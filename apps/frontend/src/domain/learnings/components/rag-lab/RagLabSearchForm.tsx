import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMField,
  PMHStack,
  PMInput,
  PMNativeSelect,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { ResultType } from '@packmind/types';

interface RagLabSearchFormProps {
  onSearch: (
    queryText: string,
    threshold: number,
    maxResults?: number,
    resultTypes?: ResultType,
  ) => void;
  isSearching: boolean;
}

export function RagLabSearchForm({
  onSearch,
  isSearching,
}: RagLabSearchFormProps) {
  const [queryText, setQueryText] = useState('');
  const [maxResults, setMaxResults] = useState<number>(10);
  const [resultTypes, setResultTypes] = useState<ResultType>('both');
  const [threshold, setThreshold] = useState<number>(0.7);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryText.trim()) {
      onSearch(queryText.trim(), threshold, maxResults, resultTypes);
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
          />
          <PMText fontSize="sm">
            Search uses AI embeddings to find semantically similar content
          </PMText>
        </PMVStack>

        <PMHStack gap={4} align="flex-start">
          <PMField.Root>
            <PMField.Label>Result Type</PMField.Label>
            <PMNativeSelect
              value={resultTypes}
              onChange={(e) => setResultTypes(e.target.value as ResultType)}
              items={[
                { label: 'All', value: 'both' },
                { label: 'Standards Only', value: 'standards' },
                { label: 'Recipes Only', value: 'recipes' },
              ]}
            />
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>Similarity Threshold</PMField.Label>
            <PMNativeSelect
              value={threshold.toString()}
              onChange={(e) => setThreshold(Number(e.target.value))}
              items={[
                { label: '50% (More results)', value: '0.5' },
                { label: '60%', value: '0.6' },
                { label: '70% (Recommended)', value: '0.7' },
                { label: '80%', value: '0.8' },
                { label: '90% (Very strict)', value: '0.9' },
              ]}
            />
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>Max Results</PMField.Label>
            <PMNativeSelect
              value={maxResults.toString()}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              items={[
                { label: '5 results', value: '5' },
                { label: '10 results', value: '10' },
                { label: '20 results', value: '20' },
                { label: '50 results', value: '50' },
              ]}
            />
          </PMField.Root>
        </PMHStack>

        <PMButton
          type="submit"
          disabled={!queryText.trim() || isSearching}
          loading={isSearching}
        >
          Search
        </PMButton>
      </PMVStack>
    </PMBox>
  );
}
