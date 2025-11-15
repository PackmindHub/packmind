# Technical Decision Capture and Management Flow - Implementation Plan

## Overview

This feature allows capturing technical decisions as Topics, distilling them into Knowledge Patches, and applying/rejecting those patches to update Standards/Recipes.

---

## Phase 1: Create Learnings Domain Package & Setup

**Goal**: Set up the new `@packmind/learnings` domain package following hexagonal architecture and wire it into the API and MCP server.

### Tasks:

1. **Create package structure**
   - `packages/learnings/src/application/` - Use cases and adapter
   - `packages/learnings/src/domain/` - Domain interfaces
   - `packages/learnings/src/infra/` - Infrastructure (schemas, repositories)
   - `packages/learnings/src/LearningsHexa.ts` - Main facade
   - `packages/learnings/src/index.ts` - Public exports

2. **Set up package configuration**
   - `package.json` with dependencies
   - TypeScript configs (tsconfig.json, tsconfig.lib.json, tsconfig.spec.json)
   - `jest.config.ts`
   - `eslint.config.mjs`
   - `project.json` (NX)

3. **Create LearningsHexa facade**
   - Initialize method with registry
   - Expose adapter

4. **Create LearningsAdapter (empty for now)**
   - Implements ILearningsPort interface
   - Will be populated in Phase 2

5. **Define ILearningsPort in @packmind/types**
   - Port interface (empty for now)
   - Will add methods in Phase 2

6. **Wire into API**
   - Register LearningsHexa in API module
   - Create NestJS decorator for adapter injection

7. **Wire into MCP server**
   - Make learnings adapter available in MCP context

---

## Phase 2: Capture Topics

**Goal**: Create Topic entity and use case to capture technical decisions, expose via MCP tool.

### Tasks:

1. **Create Topic schema (TypeORM)**
   - `packages/learnings/src/infra/schemas/TopicSchema.ts`
   - Fields: id, spaceId, title, content, codeExamples (jsonb), fileReferences (jsonb), captureContext (jsonb), status, createdBy, createdAt, updatedAt, deletedAt

2. **Create migration**
   - TypeORM migration for Topic table

3. **Create TopicRepository**
   - `packages/learnings/src/infra/repositories/TopicRepository.ts`
   - Methods: findBySpaceId, findPendingForDistillation

4. **Create CreateTopic use case**
   - `packages/learnings/src/application/useCases/createTopic/createTopic.usecase.ts`
   - Command/Response types in `@packmind/types`
   - Tests

5. **Update LearningsAdapter**
   - Add createTopic method

6. **Update ILearningsPort**
   - Add createTopic command/response types

7. **Create MCP tool: packmind_create_topic**
   - `apps/mcp-server/src/tools/create-topic.ts`
   - Directly calls LearningsAdapter.createTopic (no API endpoint needed)
   - Test with MCP inspector

---

## Phase 3: Distillation

**Goal**: Analyze a single topic and generate knowledge patch (proposed changes to standards/recipes). Distilled topics are soft-deleted.

### Tasks:

1. **Create KnowledgePatch schema (TypeORM)**
   - `packages/learnings/src/infra/schemas/KnowledgePatchSchema.ts`
   - Fields: id, spaceId, topicId, patchType, targetId, proposedChanges (jsonb), diffPreview (text), status, reviewedBy, reviewedAt, reviewNotes, createdAt, updatedAt, deletedAt

2. **Create migration**
   - TypeORM migration for KnowledgePatch table

3. **Create KnowledgePatchRepository**
   - `packages/learnings/src/infra/repositories/KnowledgePatchRepository.ts`
   - Methods: findBySpaceId, findPendingReview

4. **Create DistillationService**
   - `packages/learnings/src/infra/services/DistillationService.ts`
   - Analyze topic against existing standards/recipes (via ports)
   - Use LLM/AI to determine if new artifact or update
   - Generate diff/patch proposal

5. **Create DistillTopic use case** (single topic)
   - `packages/learnings/src/application/useCases/distillTopic/distillTopic.usecase.ts`
   - Input: topicId
   - Call DistillationService
   - Create KnowledgePatch entity
   - Soft-delete the topic
   - Tests

6. **Update LearningsAdapter**
   - Add distillTopic method
   - Initialize with StandardsPort and RecipesPort dependencies

7. **Update ILearningsPort**
   - Add distillTopic command/response types

---

## Phase 4: Patches Management UI

**Goal**: Display knowledge patches in the frontend with diff view.

### Tasks:

1. **Create frontend gateway**
   - `apps/frontend/src/domain/learnings/api/LearningsGateway.ts`
   - Interface + implementation

2. **Create query keys**
   - `apps/frontend/src/domain/learnings/api/queryKeys.ts`
   - Hierarchical structure

3. **Create queries**
   - `apps/frontend/src/domain/learnings/api/queries.ts`
   - useGetKnowledgePatchesQuery
   - useGetKnowledgePatchQuery

4. **Create ListKnowledgePatches use case (backend)**
   - `packages/learnings/src/application/useCases/listKnowledgePatches/listKnowledgePatches.usecase.ts`
   - Tests

5. **Create GetKnowledgePatch use case (backend)**
   - `packages/learnings/src/application/useCases/getKnowledgePatch/getKnowledgePatch.usecase.ts`
   - Tests

6. **Create NestJS controller endpoints**
   - `GET /api/knowledge-patches`
   - `GET /api/knowledge-patches/:id`

7. **Create UI components**
   - `KnowledgePatchCard` - Patch summary card
   - `DiffViewer` - Display diffs
   - `PatchTypeBadge` - Visual indicator of patch type

8. **Create React Router routes**
   - `knowledge-patches._index.tsx` - List patches
   - `knowledge-patches.$patchId.tsx` - Patch detail with diff

---

## Phase 5: Apply or Reject Patch

**Goal**: Allow users to accept (apply changes) or reject patches.

### Tasks:

1. **Create AcceptKnowledgePatch use case**
   - `packages/learnings/src/application/useCases/acceptKnowledgePatch/acceptKnowledgePatch.usecase.ts`
   - Validate patch
   - Apply changes via StandardsPort/RecipesPort
   - Mark patch as accepted
   - Tests

2. **Create RejectKnowledgePatch use case**
   - `packages/learnings/src/application/useCases/rejectKnowledgePatch/rejectKnowledgePatch.usecase.ts`
   - Mark patch as rejected with notes
   - Tests

3. **Update LearningsAdapter**
   - Add acceptKnowledgePatch and rejectKnowledgePatch methods

4. **Update ILearningsPort**
   - Add command/response types

5. **Create NestJS controller endpoints**
   - `POST /api/knowledge-patches/:id/accept`
   - `POST /api/knowledge-patches/:id/reject`

6. **Create frontend mutations**
   - `apps/frontend/src/domain/learnings/api/mutations.ts`
   - useAcceptPatchMutation
   - useRejectPatchMutation

7. **Create PatchReviewModal component**
   - Accept/Reject actions
   - Notes input for rejection

8. **Wire up to patch detail route**
   - Add accept/reject buttons
   - Show modal on action
   - Handle success/error states

---

## Key Design Decisions

- **Topics as Database Objects**: Captured directly by agent via MCP tool
- **Distillation Uses AI**: LLM analyzes topics against existing knowledge base
- **Patches Show Diffs**: Users preview changes before applying
- **Port-Based Integration**: Use StandardsPort/RecipesPort to apply changes
- **Hexagonal Architecture**: Clean separation of concerns across all layers

---

## Future Enhancements (Not in Initial Phases)

- learnings.md file capture
- CLI commands
- Batch topic creation
- Automated capture mechanisms
- Notifications for new patches
