# RAG Lab Enhancement Plan

## Overview

Build a standalone RAG Lab feature that provides a dedicated interface for exploring, testing, and managing the RAG embedding system. This creates the foundational infrastructure for semantic search across Standards and Recipes without coupling to any specific feature (like distillation).

The RAG Lab will serve as:

- **Development tool**: Test and validate semantic search queries
- **Operations dashboard**: Monitor embedding coverage and health
- **Management interface**: Trigger backfills and manage embeddings

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
- **Chunking**: Not needed - Standards and Recipes are already appropriately sized

### Architecture Decisions

1. **Model**: text-embedding-3-small
2. **Dimensions**: Full 1536
3. **Similarity**: Dot product via pgvector
4. **Threshold**: Start with 0.7 (tune based on results)
5. **Background Jobs**: JobsService for async embedding generation
6. **Database**: PostgreSQL + pgvector extension
7. **Version Strategy**: Only embed latest versions of artifacts

### Testing Strategy

**Challenge**: pg-mem (in-memory PostgreSQL emulator used for unit tests) does not support the pgvector extension (native C extension).

**Pragmatic Solution**: Accept test/production type difference and use appropriate testing strategies:

**Unit Tests (with pg-mem)**:

- TypeORM schemas use `type: String` for embedding column (pg-mem compatible)
- Store embeddings as JSON strings: `JSON.stringify(embedding)`
- Parse when reading: `JSON.parse(storedValue)`
- Test basic CRUD operations (save/retrieve embeddings)
- Skip pgvector-specific operations (similarity search)

**Integration Tests (with real PostgreSQL + pgvector)**:

- Use actual PostgreSQL database with pgvector extension enabled
- Test similarity search with real `vector(1536)` type
- Test ivfflat indexing and performance
- Validate threshold filtering and dot product operations
- Required for Unit 3 repository layer testing

**Why This Approach**:

- ✅ Maintains clean domain model (embedding as part of version entity)
- ✅ No JOIN overhead in production queries
- ✅ Follows existing integration test patterns in codebase
- ✅ Realistic testing with actual pgvector for critical operations
- ✅ Minimal complexity - no architectural compromises

**Production Behavior**:

- Migrations create actual `vector(1536)` columns
- pgvector extension handles similarity search efficiently
- ivfflat indexes provide optimized approximate nearest neighbor search

**Type Mapping**:

- **Database (production)**: `vector(1536)` (pgvector type)
- **Database (pg-mem tests)**: `text` (from TypeORM String type)
- **TypeORM Schema**: `type: String, nullable: true`
- **TypeScript Types**: `embedding?: number[]`
- **Application Logic**: Works with `number[]` arrays

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

**Testing Considerations**:

- Migrations only run in production/development (not in unit tests)
- Unit tests use `datasource.synchronize()` which generates schema from TypeORM entities
- TypeORM schemas use `type: String` to maintain pg-mem compatibility
- Production databases use actual `vector(1536)` type from migrations
- Similarity search testing deferred to Unit 3 (requires real PostgreSQL + pgvector)

**Deliverables**:

- Three migration files with proper logging and rollback:
  - Enable pgvector extension
  - Add embedding column to standard_versions with ivfflat index
  - Add embedding column to recipe_versions with ivfflat index
- Updated schemas with `embedding: { type: String, nullable: true }`
- Updated types with `embedding?: number[]`
- Docker Compose updated to use `pgvector/pgvector:pg17` image

---

### Unit 2: Embedding Service ✅ COMPLETED

**Goal**: Create reusable OpenAI embedding service

**Actual Implementation**:

1. ✅ Extended existing `OpenAIService.ts` in `packages/node-utils/src/ai/prompts/`
   - Added `generateEmbedding(text: string): Promise<number[]>`
   - Added `generateEmbeddings(texts: string[]): Promise<number[][]>` (batch support)
   - Model: text-embedding-3-small (1536 dimensions)
   - Retry logic with immediate retries (matches existing OpenAIService pattern - NO exponential backoff)
   - Full error handling and logging
   - Token usage tracking
   - Graceful handling when API key missing (returns empty arrays)

2. ✅ Updated `AIService.ts` interface (provider-agnostic)
   - Added embedding method signatures to existing interface
   - Maintains consistency with prompt execution methods

3. ✅ Created `TextExtractor.ts` in `packages/learnings/src/application/services/`
   - `extractStandardText(version: StandardVersion): string`
     - Combines: name + description + rules content
   - `extractRecipeText(version: RecipeVersion): string`
     - Combines: name + content
   - Comprehensive markdown stripping utility:
     - Removes code blocks, inline code, images, links
     - Removes headers, bold, italic, blockquotes, lists
     - Normalizes whitespace
   - All text cleaned before embedding for optimal semantic search

4. ✅ Comprehensive unit tests
   - `OpenAIService.spec.ts`: 12 new tests for embedding methods
     - Mock OpenAI API responses
     - Test error handling, retries (rate limit, network, auth)
     - Test batch processing
     - Validate embedding dimensions (1536)
     - Test graceful API key missing handling
   - `TextExtractor.spec.ts`: 18 tests
     - Test standard and recipe text extraction
     - Test markdown stripping for all formatting types
     - Test whitespace normalization
     - Test edge cases (empty content, no rules, etc.)

5. ✅ Updated test mocks in dependent packages
   - Fixed `RecipeSummaryService.spec.ts` mock
   - Fixed `StandardSummaryService.spec.ts` mock
   - Added `@packmind/recipes` dependency to learnings package

**Deliverables**:

- ✅ OpenAIService extended with embedding methods (NOT separate service - reuses existing infrastructure)
- ✅ AIService interface updated
- ✅ TextExtractor utility in learnings package
- ✅ Unit tests (131 passed in node-utils, 66 passed in learnings)
- ✅ All lint and test stages passing

**Key Decisions**:

- **Extended existing OpenAIService** instead of creating separate service to avoid duplication
- **Immediate retry logic** (not exponential backoff) to match existing OpenAIService pattern
- **TextExtractor in learnings package** (domain-specific) rather than node-utils (generic utilities)
- **Comprehensive markdown stripping** ensures clean text for embeddings

---

### Unit 3: Repository Layer ✅ COMPLETED

**Goal**: Add embedding storage and similarity search to repositories

**Actual Implementation**:

**1. ✅ Extended IStandardVersionRepository Interface**

- Added `updateEmbedding(versionId, embedding): Promise<void>`
- Added `findSimilarByEmbedding(embedding, spaceId?, threshold?): Promise<Array<StandardVersion & { similarity }>>`
- Added `findLatestVersionsWhereEmbeddingIsNull(spaceId?): Promise<StandardVersion[]>`

**2. ✅ Implemented Methods in StandardVersionRepository**

- `updateEmbedding()`: Uses `repository.update()` with native vector storage (number[])
  - Throws error if version not found
  - Logs embedding dimensions and success/failure
- `findSimilarByEmbedding()`: Uses QueryBuilder with pgvector `<#>` operator
  - Default threshold: 0.7
  - Filters: `embedding IS NOT NULL` and `similarity >= threshold`
  - Optional space filtering via JOIN with standards table
  - Orders by similarity DESC
- `findLatestVersionsWhereEmbeddingIsNull()`:
  - Fetches all versions without embeddings
  - Groups by standardId in-memory (pg-mem compatible)
  - Returns only latest version for each standard

**3. ✅ Extended IRecipeVersionRepository Interface**

- Same three methods as IStandardVersionRepository
- Adjusted types for RecipeVersionId and RecipeVersion

**4. ✅ Implemented Methods in RecipeVersionRepository**

- Mirrored StandardVersionRepository implementation
- Uses `recipes` table for space filtering (JOIN on recipe_id)

**5. ✅ Added Unit Tests (pg-mem compatible)**

- **StandardVersionRepository.spec.ts**: 5 new tests
  - Returns only latest versions without embeddings
  - Excludes latest versions that have embeddings
  - Returns multiple latest versions from different standards
  - Excludes older versions even without embeddings
  - Returns empty array when all latest versions have embeddings
  - Skipped `updateEmbedding()` test (requires pgvector)
  - Skipped `findSimilarByEmbedding()` test (requires pgvector)

- **RecipeVersionRepository.spec.ts**: 5 new tests
  - Same coverage as StandardVersionRepository
  - Skipped vector-dependent tests

**6. ✅ Updated Service Mocks**

- Fixed `StandardVersionService.spec.ts` to include new repository methods

**Deliverables**:

- ✅ Repository interfaces extended for both domains
- ✅ Repository implementations with native vector storage
- ✅ Unit tests for `findLatestVersionsWhereEmbeddingIsNull()` (10 tests total)
- ✅ All lint and test checks passing
- ⏭️ Integration tests for `updateEmbedding()` and `findSimilarByEmbedding()` deferred to Unit 8

**Key Decisions**:

- **Native Vector Storage**: Embeddings stored as `number[]` directly, PostgreSQL handles vector type conversion
- **pg-mem Compatibility**: Used in-memory grouping instead of SQL subqueries for latest version logic
- **Deferred Vector Tests**: Vector-dependent tests deferred to integration tests (Unit 8) - pg-mem doesn't support pgvector
- **Space Filtering**: Implemented via JOINs with parent tables (standards/recipes)
- **Default Threshold**: 0.7 for similarity search (cosine similarity scale 0-1)

**Integration Tests (Deferred to Unit 8)**:

- Test `updateEmbedding()` with real PostgreSQL + pgvector
- Test `findSimilarByEmbedding()` with actual vector operations
- Verify pgvector `<#>` operator works correctly
- Test threshold filtering and result ordering
- Test space filtering with real data
- Verify ivfflat index performance

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
3. Add `findLatestVersionsWithoutEmbedding(spaceId?)`
   - Delegate to repository

**RecipeVersionService**:

1. Same methods as StandardVersionService
   - `generateAndSaveEmbedding(versionId)`
   - `findSimilarByEmbedding(embedding, spaceId?, threshold?)`
   - `findLatestVersionsWithoutEmbedding(spaceId?)`

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

### Unit 6: RAG Lab Frontend & API

**Goal**: Create RAG Lab UI and backend endpoints

**Tasks**:

**Backend (Learnings Domain)**:

1. Create `SearchArtifactsBySemanticsUsecase` (member use case)
   - Input: `{ queryText: string, spaceId: SpaceId, threshold?: number }`
   - Generate embedding from queryText
   - Query StandardVersionService and RecipeVersionService in parallel
   - Return: `{ standards: Array<...>, recipes: Array<...> }` with similarity scores
   - Sort by similarity descending

2. Create `GetEmbeddingHealthUsecase` (member use case)
   - Count total latest versions vs embedded latest versions
   - Return: `{ totalStandards, embeddedStandards, totalRecipes, embeddedRecipes, coveragePercent }`

3. Create `TriggerEmbeddingBackfillUsecase` (admin use case)
   - Enqueue backfill job (from Unit 7)
   - Return job ID for tracking

4. Add gateway methods to `ILearningsGateway`:
   - `searchArtifactsBySemantics: Gateway<ISearchArtifactsBySemanticsUseCase>`
   - `getEmbeddingHealth: Gateway<IGetEmbeddingHealthUseCase>`
   - `triggerEmbeddingBackfill: Gateway<ITriggerEmbeddingBackfillUseCase>`

5. Implement in `LearningsGatewayApi`

**Frontend (React Router + TanStack Query)**:

1. Update `routes.ts`:

   ```tsx
   toRagLab: (orgSlug: string, spaceSlug: string) =>
     `/org/${orgSlug}/space/${spaceSlug}/learnings/rag-lab`;
   ```

2. Add sidebar entry in `SidebarNavigation.tsx` (Knowledge base section):

   ```tsx
   <SidebarNavigationLink
     key="rag-lab"
     url={routes.space.toRagLab(orgSlug, currentSpaceSlug)}
     label="RAG Lab"
   />
   ```

3. Create route files:
   - `learnings.rag-lab.tsx` (layout with breadcrumb)
   - `learnings.rag-lab._index.tsx` (page component)

4. Add query keys in `queryKeys.ts`:

   ```tsx
   SEARCH_ARTIFACTS_BY_SEMANTICS = 'search-artifacts-by-semantics',
   GET_EMBEDDING_HEALTH = 'get-embedding-health',
   ```

5. Create query hooks in `LearningsQueries.ts`:
   - `useSearchArtifactsBySemanticsQuery(queryText, threshold?)`
   - `useEmbeddingHealthQuery()`
   - `useTriggerEmbeddingBackfillMutation()`

6. Create components in `src/domain/learnings/components/`:
   - `RagLabDashboard.tsx` - Main container
   - `EmbeddingHealthCard.tsx` - Shows coverage stats
   - `SemanticSearchForm.tsx` - Query input with threshold slider
   - `SearchResultsList.tsx` - Display results with similarity scores
   - `BackfillTriggerButton.tsx` - Admin button to trigger backfill

**Deliverables**:

- Backend use cases and gateway methods
- Frontend routes and navigation
- TanStack Query hooks
- UI components following @packmind/ui standards
- Tests for use cases and components

---

### Unit 7: Backfill & Tooling

**Goal**: Generate embeddings for existing artifacts (latest versions only)

**Tasks**:

1. Create `GenerateEmbeddingsForArtifactsUsecase` (admin use case)
   - Find latest StandardVersions without embeddings via `findLatestVersionsWithoutEmbedding()`
   - Find latest RecipeVersions without embeddings via `findLatestVersionsWithoutEmbedding()`
   - **Critical**: Only process latest versions, skip historical versions
   - Process in batches (100 per batch)
   - Rate limit protection (sleep between batches)
   - Return processed/failed counts
   - Log progress for each batch

**Deliverables**:

- Admin use case with latest-version-only logic
- Unit tests verifying only latest versions are processed

---

### Unit 8: Monitoring & Optimization

**Goal**: Add observability and tune performance

**Tasks**:

1. **Logging**
   - Embedding generation (version ID, tokens, success/failure)
   - Similarity search (query time, results count, similarity scores)
   - Backfill progress (batch number, processed count, failures)

2. **Metrics Tracking**
   - Embedding generation success rate
   - Average similarity scores
   - Results distribution (0, 1-5, 6-10, 10+)
   - Latency (embedding + search)
   - OpenAI API costs
   - Coverage percentage over time

3. **Threshold Tuning**
   - Experiment with 0.6, 0.7, 0.8
   - Measure precision/recall using RAG Lab search interface
   - Document optimal threshold

4. **Performance Tests**
   - Similarity search at scale (1000+ artifacts)
   - Batch embedding generation
   - End-to-end search latency

**Deliverables**:

- Comprehensive logging
- Metrics tracking in use cases
- Performance benchmarks
- Tuned threshold recommendation

---

### Unit 9: RAG Lab Features

**Goal**: Build interactive features for RAG exploration and management

**Tasks**:

**Search Interface**:

1. Query input with real-time validation
2. Threshold slider (0.5 - 1.0) with default at 0.7
3. Results display:
   - Grouped by type (Standards / Recipes)
   - Similarity score badges (color-coded by range)
   - Highlighted excerpts showing matched content
   - Link to view full artifact

**Dashboard**:

1. Embedding coverage visualization
   - Progress bars for Standards and Recipes
   - Total vs embedded counts
   - Percentage coverage

2. Recent searches history (local state)
   - Query text
   - Results count
   - Timestamp

3. Performance metrics:
   - Average query latency
   - Average similarity scores
   - Most common threshold values

**Management Tools**:

1. Manual backfill trigger (admin only)
   - Button with confirmation dialog
   - Progress indicator while job runs
   - Success/failure notifications

2. Embedding health alerts
   - Warning if coverage < 80%
   - Error display for failed generations

**Deliverables**:

- Interactive search UI components
- Dashboard with metrics visualization
- Admin tools for embedding management
- E2E tests for RAG Lab workflows

---

## Cost Analysis

**Assumptions**: 500 artifacts, 10 new versions/day, 5 RAG Lab searches/day

**One-time Backfill** (500 latest versions only): $0.005 (negligible)

**Ongoing (per month)**:

- New version embeddings: $0.003
- RAG Lab query embeddings: $0.001
- **Total: ~$0.004/month**

**Note**: This is infrastructure cost only. Additional features (like distillation) will add their own usage costs.

---

## Success Metrics

- **Coverage**: >95% of latest artifact versions have embeddings
- **Search Quality**: >80% of search results are semantically relevant
- **Latency**: <500ms for semantic search (embedding + query)
- **Availability**: 99.9% uptime for embedding generation jobs
- **User Adoption**: RAG Lab used for testing before integrating RAG into features

---

## Risk Mitigation

| Risk                            | Mitigation                                                   | Fallback                                           |
| ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| OpenAI rate limits              | Exponential backoff, batch processing                        | Queue-based processing                             |
| Low embedding quality           | Validate with RAG Lab before production use                  | Adjust text extraction                             |
| Database performance            | pgvector indexes, monitor queries                            | Dedicated vector DB                                |
| Cost overruns                   | Set API quotas, monitor daily                                | Cache embeddings                                   |
| Version explosion               | Only embed latest versions                                   | Periodic cleanup of old versions                   |
| Test/production type mismatch   | Integration tests with real PostgreSQL                       | Accept limitation, focus on production correctness |
| pg-mem pgvector incompatibility | Unit tests for CRUD, integration tests for similarity search | Document limitation, skip vector ops in unit tests |

---

## Future Enhancements

1. **Hybrid Search**: Keyword fallback for domain-specific terms
2. **Adaptive Thresholds**: Adjust based on query characteristics
3. **Query Expansion**: Synonyms and related terms
4. **Metadata Filtering**: Pre-filter by type, tags, author, space
5. **Caching**: Cache query embeddings for repeated searches
6. **Analytics Dashboard**: Track search patterns and popular artifacts
7. **Export Results**: Download search results as CSV/JSON
8. **Bulk Operations**: Regenerate embeddings for specific artifacts
9. **A/B Testing**: Compare different embedding models or text extraction strategies
10. **Integration Points**: Use RAG Lab infrastructure for distillation, recommendations, etc.

---

## Integration Strategy

The RAG Lab provides foundational infrastructure that can be consumed by other features:

1. **Distillation**: Use `SearchArtifactsBySemanticsUsecase` to find relevant artifacts for topics
2. **Recommendations**: Suggest related Standards/Recipes based on user activity
3. **Smart Search**: Enhance global search with semantic capabilities
4. **Auto-tagging**: Use embeddings to automatically categorize new artifacts

The decoupled design ensures RAG Lab can evolve independently while serving multiple consumers.
