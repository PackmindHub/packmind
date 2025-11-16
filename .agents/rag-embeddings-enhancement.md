# RAG-Based Artifact Search Enhancement Plan v2

## Overview

Replace the current LLM-based artifact filtering in distillation (step 1) with a RAG approach using OpenAI embeddings for semantic search across Standards and Recipes.

---

## Research Summary & Key Decisions

### OpenAI Embeddings

- **Model**: text-embedding-3-small (1536 dimensions, $0.00002/1k tokens)
- **Performance**: 75.8% accuracy, sufficient for our use case
- **Max input**: 8,192 tokens per embedding
- **Vectors**: Normalized (enables fast dot product similarity)

### RAG Best Practices (2024-2025)

- **Similarity Metric**: Dot product for normalized embeddings (faster than cosine)
- **Retrieval Strategy**: Threshold-based (return all results above threshold, not fixed top-K)
- **Re-ranking**: LLM-based re-ranking critical for distinguishing semantic similarity from actual relevance
- **Chunking**: Not needed - Standards and Recipes are already appropriately sized

### Architecture Decisions

1. **Model**: text-embedding-3-small
2. **Dimensions**: Full 1536
3. **Similarity**: Dot product via pgvector
4. **Threshold**: Start with 0.7 (tune based on results)
5. **Re-ranking**: Lightweight LLM re-ranking using summaries (not full content)
6. **Background Jobs**: JobsService for async embedding generation
7. **Database**: PostgreSQL + pgvector extension

---

## Implementation Phases

### Unit 1: Database Foundation

**Goal**: Add pgvector support and embedding columns to version tables

**Tasks**:

1. Create migration: Enable pgvector extension
2. Create migration: Add `embedding vector(1536)` column to `standard_versions` and `recipe_versions`
3. Create vector indexes using ivfflat
4. Update TypeORM schemas (StandardVersionSchema, RecipeVersionSchema)
5. Update type definitions in `@packmind/types` (StandardVersion, RecipeVersion)
6. Run and test migrations locally

**Migration Pattern**: Follow Packmind recipe with TypeORM CLI and PackmindLogger

**Deliverables**:

- Two migration files with proper logging and rollback
- Updated schemas with `embedding?: number[]`
- Updated types

---

### Unit 2: Embedding Service

**Goal**: Create reusable OpenAI embedding service

**Tasks**:

1. Create `OpenAIEmbeddingService.ts` in `packages/node-utils/src/ai/embeddings/`
   - `generateEmbedding(text: string): Promise<number[]>`
   - `generateEmbeddings(texts: string[]): Promise<number[][]>` (batch support)
   - Model: text-embedding-3-small
   - Retry logic with exponential backoff (match OpenAIService pattern)
   - Error handling and logging
   - Token usage tracking

2. Create `EmbeddingService.ts` interface (provider-agnostic)

3. Create `TextExtractor.ts` utility
   - `extractStandardText(version: StandardVersion): string`
   - `extractRecipeText(version: RecipeVersion): string`
   - `extractTopicText(topic: Topic): string`

4. Write unit tests
   - Mock OpenAI API responses
   - Test error handling, retries, batch processing
   - Validate embedding dimensions (1536)

5. Export from `@packmind/node-utils`

**Deliverables**:

- OpenAIEmbeddingService with retry logic
- EmbeddingService interface
- TextExtractor utility
- Unit tests

---

### Unit 3: Repository Layer

**Goal**: Add embedding storage and similarity search to repositories

**Tasks**:

**StandardVersionRepository**:

1. Add `updateEmbedding(versionId, embedding): Promise<void>`
2. Add `findSimilarByEmbedding(embedding, spaceId?, threshold?): Promise<Array<StandardVersion & { similarity }>>`
   - Query: Use pgvector `<#>` operator (negative dot product)
   - Filter by threshold: `(embedding <#> $1) * -1 >= threshold`
   - Return ALL results above threshold (no LIMIT)
3. Add `findWhereEmbeddingIsNull(): Promise<StandardVersion[]>` (for backfill)

**RecipeVersionRepository**:

1. Same methods as StandardVersionRepository

**Integration Tests**:

- Test similarity search with actual vectors in test database
- Verify threshold filtering
- Test empty results

**Deliverables**:

- Repository methods for both domains
- Integration tests

---

### Unit 4: Domain Services

**Goal**: Add embedding generation to domain services

**Tasks**:

**StandardVersionService**:

1. Add `generateAndSaveEmbedding(versionId): Promise<void>`
   - Get version by ID
   - Extract text using TextExtractor
   - Generate embedding
   - Save to repository
2. Add `findSimilarByEmbedding(embedding, spaceId?, threshold?)`
   - Delegate to repository

**RecipeVersionService**:

1. Same methods as StandardVersionService

**Unit Tests**:

- Mock repositories and embedding service
- Test happy path and error handling

**Deliverables**:

- Service methods for both domains
- Unit tests

---

### Unit 5: Background Jobs Integration

**Goal**: Trigger embedding generation on version creation

**Tasks**:

1. Create `GenerateStandardEmbeddingJob` in `packages/standards/src/application/jobs/`
   - Constructor: inject StandardVersionService
   - Execute method: call generateAndSaveEmbedding
   - Error handling with logging

2. Create `GenerateRecipeEmbeddingJob` in `packages/recipes/src/application/jobs/`
   - Same pattern

3. Update `CreateStandardUsecase`
   - After creating StandardVersion, enqueue job

4. Update `UpdateStandardUsecase`
   - After creating new StandardVersion, enqueue job

5. Update `CaptureRecipeUsecase`
   - After creating RecipeVersion, enqueue job

6. Update `UpdateRecipeFromUIUsecase`
   - After creating new RecipeVersion, enqueue job

**E2E Tests**:

- Verify embedding is generated after version creation
- Verify job retries on failure

**Deliverables**:

- Two job classes
- Updated use cases
- E2E tests

---

### Unit 6: RAG Retrieval & Re-ranking

**Goal**: Implement RAG-based artifact retrieval with LLM re-ranking

**Tasks**:

1. Create `RAGRetrievalService.ts` in `packages/learnings/src/application/services/`

2. Implement `findRelevantArtifacts(topic, threshold)`
   - Extract topic text
   - Generate embedding
   - Query StandardVersionService and RecipeVersionService in parallel
   - Return all artifacts above threshold

3. Implement `rerankArtifacts(topic, standards, recipes)`
   - Early return if ≤1 total artifacts
   - Combine standards + recipes with summaries (not full content)
   - LLM prompt: rank by relevance, filter irrelevant
   - Use fast model (gpt-4.1-mini), JSON mode, max 200 tokens
   - Split results back into standards/recipes with relevanceRank

4. Update `DistillationService`
   - Replace LLM filtering with RAG retrieval
   - Add re-ranking step
   - Log similarity scores and re-ranking results
   - Pass re-ranked artifacts to patch generation

5. Write tests
   - Unit tests for RAG service
   - E2E test for full distillation flow
   - Compare RAG approach vs old LLM filtering

**Deliverables**:

- RAGRetrievalService with retrieval and re-ranking
- Updated DistillationService
- Tests

---

### Unit 7: Backfill & Tooling

**Goal**: Generate embeddings for existing artifacts

**Tasks**:

1. Create `GenerateEmbeddingsForArtifactsUsecase` (admin use case)
   - Find all StandardVersions without embeddings
   - Find all RecipeVersions without embeddings
   - Process in batches (100 per batch)
   - Rate limit protection (sleep between batches)
   - Return processed/failed counts

2. Create MCP tool `packmind_generate_embeddings`
   - Call admin use case
   - Show progress in real-time
   - Report results

3. Documentation
   - How to run backfill manually
   - Expected duration and costs

**Deliverables**:

- Admin use case
- MCP tool
- Documentation

---

### Unit 8: Monitoring & Optimization

**Goal**: Add observability and tune performance

**Tasks**:

1. **Logging**
   - Embedding generation (version ID, tokens, success/failure)
   - Similarity search (query time, results count, similarity scores)
   - Re-ranking (artifacts before/after, top results)

2. **Metrics Tracking**
   - Embedding generation success rate
   - Average similarity scores
   - Results distribution (0, 1-5, 6-10, 10+)
   - Re-ranking impact (order changes)
   - Latency (embedding + search + re-ranking)
   - OpenAI API costs

3. **Threshold Tuning**
   - Experiment with 0.6, 0.7, 0.8
   - Measure precision/recall
   - Document optimal threshold

4. **Performance Tests**
   - Similarity search at scale (1000+ artifacts)
   - Batch embedding generation
   - End-to-end distillation latency

**Deliverables**:

- Comprehensive logging
- Metrics dashboard/reports
- Performance benchmarks
- Tuned threshold recommendation

---

## Cost Analysis

**Assumptions**: 500 artifacts, 10 new versions/day, 20 distillations/day

**One-time Backfill**: $0.005 (negligible)

**Ongoing (per month)**:

- New version embeddings: $0.003
- Distillation embeddings: $0.006
- Re-ranking: $0.006
- **Total: ~$0.02/month**

---

## Success Metrics

- **Precision**: >80% of retrieved artifacts are relevant
- **Recall**: >80% of relevant artifacts found
- **Latency**: <1000ms (embedding + search + re-ranking)
- **Cost**: <$0.15 per distillation
- **Re-ranking Accuracy**: LLM re-ranking improves relevance vs semantic similarity alone

---

## Risk Mitigation

| Risk                  | Mitigation                            | Fallback                  |
| --------------------- | ------------------------------------- | ------------------------- |
| OpenAI rate limits    | Exponential backoff, batch processing | Queue-based processing    |
| Low embedding quality | A/B test RAG vs current approach      | Keep LLM filtering option |
| Database performance  | pgvector indexes, monitor queries     | Dedicated vector DB       |
| Cost overruns         | Set API quotas, monitor daily         | Cache embeddings          |

---

## Future Enhancements

1. **Hybrid Search**: Keyword fallback for domain-specific terms
2. **Adaptive Thresholds**: Adjust based on query characteristics
3. **Query Expansion**: Synonyms and related terms
4. **Metadata Filtering**: Pre-filter by type, tags, author
5. **Caching**: Cache topic embeddings for repeated attempts
6. **Analytics**: Track frequently retrieved artifacts
7. **User Feedback**: Allow relevance marking to tune threshold
