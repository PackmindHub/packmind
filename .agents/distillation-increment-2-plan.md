# Distillation Increment 2: Change Type Classification & Specialized Prompts

## Overview

Enhance the distillation process to classify change types before generating patches, then route to specialized prompts for better results.

## Architecture

```
Topic → Filter Artifacts (quick) → Classify Change Type → Route to Specialized Prompt → Generate Patch → Apply Patch
```

## Goals

1. **Quick artifact filtering**: Send only minimal data (name + summary/first 2 lines) to initial LLM filter
2. **Change type classification**: Determine operation type (edit/create/no_change) per artifact before computing changes
3. **Specialized prompts**: Tailored prompts for each artifact type + operation type combination
4. **Comprehensive updates**: Patches can modify name, content, rules/steps, AND examples atomically

## Implementation Steps

### Step 1: Quick Artifact Filtering Enhancement

**File:** `packages/learnings/src/application/services/DistillationService.ts`

**Changes:**

- Update `filterCandidateStandards()`: Send only name + summary to LLM
- Update `filterCandidateRecipes()`: Send only name + first 2 lines to LLM
- Keep existing filtering logic (returns relevant artifact IDs)

**Purpose:** Performance optimization - reduce tokens sent to LLM in initial filter

---

### Step 2: New Change Type Classification

**File:** `packages/learnings/src/application/services/DistillationService.ts`

**New Method:** `classifyChangeType(topic, artifact, artifactType)`

**New Types:**

```typescript
type ChangeClassification =
  | 'edit_standard'
  | 'edit_recipe'
  | 'create_standard'
  | 'create_recipe'
  | 'no_change';
```

**Flow:**

1. Fetch full artifact content
2. Call LLM with classification prompt
3. Return classification label only (no changes computed yet)

**New Prompt File:** `packages/learnings/src/application/prompts/classifyChangeTypePrompt.ts`

**Purpose:** Determine what type of operation is needed before detailed analysis

---

### Step 3: Specialized Analysis Services

**File:** `packages/learnings/src/application/services/DistillationService.ts`

**New Methods:**

#### 1. `analyzeStandardEdit(topic, standard)`

- **Can modify:** name, content, rules (add/update/delete), examples (add/update/delete)
- **Returns:** Structured changes for all sections
- **Prompt:** `packages/learnings/src/application/prompts/analyzeStandardEditPrompt.ts`

#### 2. `analyzeRecipeEdit(topic, recipe)`

- **Can modify:** name, content, examples (add/update/delete)
- **Returns:** Structured changes for all sections
- **Prompt:** `packages/learnings/src/application/prompts/analyzeRecipeEditPrompt.ts`

#### 3. `analyzeNewStandard(topic)` (enhance existing)

- **Addition:** Include examples in proposal
- **Update:** `analyzeStandardMatchPrompt.ts` → repurpose for new standards

#### 4. `analyzeNewRecipe(topic)` (enhance existing)

- **Addition:** Include examples in proposal
- **Update:** `analyzeRecipeMatchPrompt.ts` → repurpose for new recipes

**Purpose:** Tailored prompts for better LLM results per operation type

---

### Step 4: Enhanced Patch Structures

**File:** `packages/types/src/learnings/KnowledgePatch.ts`

#### UPDATE_STANDARD proposedChanges:

```typescript
{
  standardId: string;
  changes: {
    name?: string;
    content?: string;
    rulesToAdd?: string[];
    rulesToUpdate?: { ruleId: string; content: string }[];
    rulesToDelete?: string[];
    exampleChanges?: {
      toAdd?: string[];
      toUpdate?: { exampleId: string; content: string }[];
      toDelete?: string[];
    };
  };
  rationale: string;
}
```

#### UPDATE_RECIPE proposedChanges:

```typescript
{
  recipeId: string;
  changes: {
    name?: string;
    content?: string;
    exampleChanges?: {
      toAdd?: string[];
      toUpdate?: { exampleId: string; content: string }[];
      toDelete?: string[];
    };
  };
  rationale: string;
}
```

#### NEW_STANDARD proposedChanges:

```typescript
{
  name: string;
  description: string;
  rules: string[];
  examples?: string[];
  scope: string;
  rationale: string;
}
```

#### NEW_RECIPE proposedChanges:

```typescript
{
  name: string;
  description: string;
  content: string;
  examples?: string[];
  rationale: string;
}
```

**Purpose:** Support atomic updates to all artifact sections including examples

---

### Step 5: Refactor DistillationService Main Flow

**File:** `packages/learnings/src/application/services/DistillationService.ts`

**New `distillTopic()` Flow:**

1. **Filter candidate standards** (quick - name + summary)
2. **Filter candidate recipes** (quick - name + 2 lines)
3. **For each filtered standard:**
   - Classify change type
   - If 'edit_standard' → call `analyzeStandardEdit()`
   - If 'no_change' → skip
   - Create patch from result
4. **For each filtered recipe:**
   - Classify change type
   - If 'edit_recipe' → call `analyzeRecipeEdit()`
   - If 'no_change' → skip
   - Create patch from result
5. **If no edit patches created:**
   - Call `analyzeNewStandard()` and/or `analyzeNewRecipe()`
   - Create 'create' patches

**Purpose:** Implement the new classification-based routing architecture

---

### Step 6: Complete PatchApplicationService

**File:** `packages/learnings/src/application/services/PatchApplicationService.ts`

**Implementations Needed:**

#### 1. `applyStandardUpdate()` (enhance existing)

- Handle name changes via standards port
- Handle content changes
- Handle rule add/update/delete
- Handle example add/update/delete

#### 2. `applyStandardCreation()` (new)

- Create standard with rules + examples

#### 3. `applyRecipeUpdate()` (new)

- Handle name changes
- Handle content updates
- Handle example changes

#### 4. `applyRecipeCreation()` (new)

- Create recipe with examples

**Purpose:** Execute all patch types against actual artifacts

---

### Step 7: Verify/Update Standards & Recipes Ports

**Standards Port Required Methods:**

- `updateStandardName()`
- `updateStandardContent()`
- `deleteStandardRule()`
- `addStandardExample()`
- `updateStandardExample()`
- `deleteStandardExample()`
- `createStandard()` (with examples support)

**Recipes Port Required Methods:**

- `updateRecipeName()`
- `updateRecipeContent()`
- `addRecipeExample()`
- `updateRecipeExample()`
- `deleteRecipeExample()`
- `createRecipe()` (with examples support)

**Action:** Verify these methods exist in respective packages. Add if missing.

**Note:** Changes may be needed in standards/recipes packages if methods don't exist.

---

### Step 8: Update Shared Types

**Files:**

- `packages/types/src/learnings/KnowledgePatch.ts` - enhanced proposedChanges types
- Consider creating discriminated union type for type-safe proposedChanges

---

## Work Breakdown (Sub-tasks for Commits)

1. **Quick filtering enhancement** - Update filter methods to send minimal data
2. **Classification system** - Add classifyChangeType method + prompt
3. **Specialized analysis - Standards** - Add analyzeStandardEdit + prompt
4. **Specialized analysis - Recipes** - Add analyzeRecipeEdit + prompt
5. **Enhanced patch types** - Update KnowledgePatch types
6. **Refactor main distillation flow** - Update distillTopic() method
7. **Patch application - Standard updates** - Enhance applyStandardUpdate()
8. **Patch application - Standard creation** - Implement applyStandardCreation()
9. **Patch application - Recipe updates** - Implement applyRecipeUpdate()
10. **Patch application - Recipe creation** - Implement applyRecipeCreation()
11. **Port methods verification** - Check/add missing port methods
12. **Tests** - Add comprehensive tests for new functionality

---

## Key Decisions

- ✅ No backward compatibility needed (existing patches deleted)
- ✅ Most changes in `learnings` package
- ✅ Patches can modify name, content, rules/steps, and examples atomically
- ✅ Classification happens before detailed analysis (performance optimization)
- ✅ Specialized prompts per artifact type + operation type
- ✅ Each sub-task gets its own commit after validation

---

## Testing Strategy

- Unit tests for classification logic
- Unit tests for each specialized analysis service
- Integration tests for full distillation flow
- Tests for patch application (all types)
- Ensure `npm run quality-gate` passes before each commit

---

## Success Criteria

- [ ] Initial filtering uses minimal data (name + summary/2 lines)
- [ ] Change type classification works for all artifact types
- [ ] Specialized prompts exist for each operation type
- [ ] Patches can update name, content, rules/steps, and examples
- [ ] All patch types can be applied successfully
- [ ] Tests pass with good coverage
- [ ] Quality gate passes
