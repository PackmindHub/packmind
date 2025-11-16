# Phase 3: Distillation Implementation Plan

## Overview

Create a job-based distillation system that analyzes Topics, generates multiple actionable KnowledgePatches (like git commits), and soft-deletes topics upon successful patch creation.

## Architecture

- **Async Processing**: Use JobService with Bull queue (like standard summaries)
- **Two-Step AI Analysis**:
  1. Filter candidates by name/summary matching
  2. Deep analysis of filtered matches
- **Multiple Patches per Topic**: A single topic can generate multiple patches (e.g., update 2 standards + create 1 new recipe)
- **Patch Deduplication**: Check for similar existing patches before creating new ones
- **Actionable Output**: KnowledgePatch contains ready-to-merge diffs/changes

---

## Task Breakdown

### **Task 1: Define Domain Types** (packages/types/)

- Create `KnowledgePatchStatus` enum: 'pending_review' | 'accepted' | 'rejected'
- Create `KnowledgePatchType` enum: 'new_standard' | 'update_standard' | 'new_recipe' | 'update_recipe'
- Create `KnowledgePatch.ts` with fields:
  - id, spaceId, topicId
  - patchType: KnowledgePatchType
  - proposedChanges (JSONB - structured diff data including target identification)
  - diffPreview (text - human-readable markdown diff)
  - status: KnowledgePatchStatus
  - reviewedBy, reviewedAt, reviewNotes (nullable)
- Create `DistillTopicCommand` and `DistillTopicResponse` types
  - Response includes array of created patch IDs
- Update `ILearningsPort` interface with `distillTopic()` method

### **Task 2: Create Database Schema** (packages/learnings/src/infra/schemas/)

- Create `KnowledgePatchSchema.ts` following TopicSchema pattern
- JSONB columns for `proposed_changes` (contains target artifact info)
- Enum columns for `patch_type` and `status`
- Foreign keys to topics, spaces
- Indices on topic_id, space_id, status
- Include soft delete support
- **Note**: topic_id allows multiple patches per topic

### **Task 3: Create TypeORM Migration** (packages/migrations/)

- **Use CLI**: `npx typeorm migration:create packages/migrations/src/migrations/CreateKnowledgePatchesTable`
- Implement with PackmindLogger and try-catch blocks
- Use helper columns: uuidMigrationColumn, timestampsMigrationColumns, softDeleteMigrationColumns
- Create enum types for patch_type and status
- Foreign key constraints to topics and spaces
- Create indices on topic_id, space_id, status
- Implement proper down() migration for rollback

### **Task 4: Create Repository** (packages/learnings/src/infra/repositories/)

- Create `IKnowledgePatchRepository.ts` interface
- Create `KnowledgePatchRepository.ts` extending AbstractRepository
- Methods:
  - `findByTopicId()` - returns array of patches
  - `findBySpaceId()` - returns array
  - `findPendingReview()` - returns array
  - `findSimilarPatches()` - check for duplicates by comparing proposedChanges
  - `addBatch()` - efficiently create multiple patches
- Implement tests with test datasource

### **Task 5: Create Distillation Service** (packages/learnings/src/application/services/)

- Create `DistillationService.ts` with:
  - Inject AIService, IStandardsPort, IRecipesPort, PackmindLogger
  - `filterCandidateStandards()` - AI prompt to match by names/summaries
  - `filterCandidateRecipes()` - AI prompt to match by names
  - `analyzeStandardMatch()` - Deep analysis of specific standard
  - `analyzeRecipeMatch()` - Deep analysis of specific recipe
  - `generatePatchProposals()` - **Returns array of patches** for all matches
  - `checkSimilarPatches()` - Find existing patches to update vs create new
  - `consolidatePatches()` - Merge similar patches if multiple found
- Create prompt templates in `prompts/` directory:
  - `filterStandardCandidates.prompt.ts`
  - `filterRecipeCandidates.prompt.ts`
  - `analyzeStandardMatch.prompt.ts`
  - `analyzeRecipeMatch.prompt.ts`
- AI prompts should identify ALL relevant artifacts (not just first match)
- Handle AI service not configured gracefully

### **Task 6: Create Job Handler** (packages/learnings/src/application/jobs/)

- Create `DistillTopicJobHandler.ts` following StandardSummaryJobHandler pattern
- Orchestrate:
  - Fetch topic
  - Filter candidate standards (may find 0-N matches)
  - Filter candidate recipes (may find 0-N matches)
  - Analyze each match (sequential to avoid rate limits)
  - Check for duplicate patches
  - Consolidate similar patches
  - **Create multiple patches** (batch insert via repository)
  - Soft-delete topic only if at least one patch created
- Comprehensive logging at each step
- Error handling with job retry logic
- Use JobService for queue management

### **Task 7: Create Distill Topic Use Case** (packages/learnings/src/application/useCases/distillTopic/)

- Create `distillTopic.usecase.ts`
- Enqueue distillation job (immediate response)
- Return job status/ID
- Create `distillTopic.usecase.spec.ts` with:
  - Test job enqueuing
  - Mock JobService
  - Verify multiple patches can be created
  - Assertive test names (no "should")
  - Use stubLogger()
  - Use topicFactory for test data

### **Task 8: Update Services Layer** (packages/learnings/src/application/services/)

- Update `LearningsServices.ts` to include:
  - DistillationService
  - KnowledgePatchService (for CRUD operations)
- Create `KnowledgePatchService.ts` for business logic

### **Task 9: Update Adapter & Port Wiring** (packages/learnings/src/application/adapter/)

- Add `IStandardsPort`, `IRecipesPort` as nullable fields in LearningsAdapter
- Update `initialize()` to receive these ports from registry
- Create DistillationService with ports after initialization
- Create DistillTopicUsecase
- Implement `distillTopic()` method
- Add `isReady()` check for ports

### **Task 10: Update Hexa** (packages/learnings/src/LearningsHexa.ts)

- Update `initialize()` to retrieve Standards and Recipes ports from registry
- Pass ports to adapter's `initialize()`
- Register KnowledgePatchSchema in learningsSchemas array

### **Task 11: Register Schema with DataSource**

- Update `packages/learnings/src/infra/schemas/learningsSchemas.ts`
- Export KnowledgePatchSchema in array
- Ensure registered in TypeORM DataSource configuration

### **Task 12: Create Test Factory** (packages/learnings/test/)

- Create `knowledgePatchFactory.ts` following topicFactory pattern
- Use createKnowledgePatchId factory from @packmind/shared
- Generate valid test data with overrides
- Support creating arrays of related patches

### **Task 13: Comprehensive Testing**

- Unit tests for DistillationService:
  - Mock AI responses returning multiple matches
  - Mock Standards/Recipes ports
  - Test each analysis method independently
- Unit tests for DistillTopicUsecase
- Integration tests for KnowledgePatchRepository:
  - Test batch operations
  - Test soft delete behavior
  - Use makeTestDatasource
  - afterEach cleanup with datasource.destroy()
- Job handler tests with scenarios:
  - Topic generates 0 patches (no matches found)
  - Topic generates 1 patch (single match)
  - Topic generates multiple patches (2+ matches)
- Test patch consolidation logic
- Use itHandlesSoftDelete utility

### **Task 14: Quality Gate**

- Run `npm run quality-gate` and fix all issues
- Ensure linting passes
- Ensure all tests pass
- Ensure no TypeScript errors

---

## Key Implementation Details

### Multiple Patches per Topic

```typescript
// A single topic about authentication might generate:
[
  {
    patchType: KnowledgePatchType.UPDATE_STANDARD,
    proposedChanges: {
      standardId: 'security-standard-id',
      action: 'addRule',
      content: 'Use JWT for auth',
    },
  },
  {
    patchType: KnowledgePatchType.UPDATE_RECIPE,
    proposedChanges: {
      recipeId: 'auth-implementation-recipe-id',
      action: 'updateStep',
      content: 'Add JWT setup instructions',
    },
  },
  {
    patchType: KnowledgePatchType.NEW_RECIPE,
    proposedChanges: {
      name: 'OAuth2 Integration',
      content: '...',
      slug: 'oauth2-integration',
    },
  },
];
```

### Two-Step AI Analysis

```
Step 1: Quick filter (parallel queries)
- Input: Topic title + content snippet
- Query: All standard summaries/names + all recipe names
- Output: Top N candidates for each type (e.g., 5 standards, 3 recipes)

Step 2: Deep analysis (for each candidate)
- Fetch full content + rules/steps
- Determine: exact match, partial match, or new artifact needed
- Generate: structured diff with rationale
- Collect all matches (not just first)
```

### Patch Deduplication & Consolidation

- Before creating patches, query existing patches by comparing proposedChanges
- If found: update existing patch instead of creating duplicate
- If multiple patches affect same artifact: consolidate into single patch with merged changes

### Soft-Delete Timing

- Topic soft-deleted **only if at least one patch created successfully**
- If distillation finds no matches: topic remains active for manual review
- Ensures topics aren't lost without generating actionable output

### Job-Based Processing

- Follows StandardSummaryJobHandler pattern
- Async processing prevents timeout on slow AI calls
- User gets immediate response with job ID
- Can poll job status or receive notification on completion

---

## Success Criteria

✅ Topics can be distilled via use case
✅ Job queue processes distillation asynchronously
✅ AI analysis filters candidates efficiently (2-step approach)
✅ **Single topic can generate 0-N KnowledgePatches**
✅ KnowledgePatches contain actionable diffs in proposedChanges
✅ Duplicate patches are merged, not duplicated
✅ Topics are soft-deleted only after successful patch creation
✅ Batch insert used for multiple patches
✅ Enums used for status and patchType
✅ Migration created with TypeORM CLI
✅ All tests pass (unit + integration)
✅ Quality gate passes
✅ Follows all Packmind standards and patterns
