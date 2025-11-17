import { useState } from 'react';
import { PMPage, PMVStack, PMBox, PMText } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { RagLabSearchForm } from '../../src/domain/learnings/components/rag-lab/RagLabSearchForm';
import { RagLabSearchResults } from '../../src/domain/learnings/components/rag-lab/RagLabSearchResults';
import { RagLabEmbeddingHealth } from '../../src/domain/learnings/components/rag-lab/RagLabEmbeddingHealth';
import { useSearchArtifactsBySemanticsQuery } from '../../src/domain/learnings/api/queries/LearningsQueries';

export default function RagLabIndexRouteModule() {
  const [searchParams, setSearchParams] = useState<{
    queryText: string;
    threshold: number;
  } | null>(null);

  const { data: searchResults, isFetching } =
    useSearchArtifactsBySemanticsQuery(
      searchParams?.queryText || '',
      searchParams?.threshold,
    );

  const handleSearch = (queryText: string, threshold: number) => {
    setSearchParams({ queryText, threshold });
  };

  return (
    <PMPage
      title="RAG Lab"
      subtitle="Search your knowledge base using semantic similarity"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <RagLabEmbeddingHealth />

        <PMBox p={6} borderWidth="1px" borderRadius="md">
          <PMVStack align="stretch" gap={6}>
            <PMVStack align="stretch" gap={2}>
              <PMText fontSize="lg" fontWeight="semibold">
                Semantic Search
              </PMText>
              <PMText>
                Search standards and recipes by meaning, not just keywords. Uses
                AI embeddings to find relevant content based on semantic
                similarity.
              </PMText>
            </PMVStack>

            <RagLabSearchForm
              onSearch={handleSearch}
              isSearching={isFetching}
            />

            {searchResults && <RagLabSearchResults results={searchResults} />}
          </PMVStack>
        </PMBox>
      </PMVStack>
    </PMPage>
  );
}
