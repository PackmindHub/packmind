# Refactor Plan: Rule-Centric Standard Distillation

## Overview

Refactor standard distillation from monolithic standard updates to granular rule-level operations. Keep recipes unchanged. Use TDD approach.

## Context & Motivation

### Current Problem

The existing flow treats standards as monolithic documents, analyzing the entire standard at once:

1. Filter relevant standards
2. Classify change type (edit_standard vs no_change)
3. Analyze entire standard with all rules and examples
4. Generate changes for the whole standard

### Why This Is Wrong

Standards are **collections of rules**. A topic typically relates to:

- ✅ A specific rule to add/update/delete
- ❌ NOT the entire standard document

### New Approach

Standards should be processed at the **rule level**:

1. Filter relevant standards
2. Classify each **rule** within the standard (keep/update/delete)
3. Generate updates only for rules that need changes
4. Consider standard description changes carefully (rare)

---

## Architecture Changes

### Old Flow

```
Topic → Filter Standards → Classify (edit_standard/no_change)
  → Analyze Entire Standard → Create Patch
```

### New Flow

```
Topic → Filter Standards
  → Classify All Rules in Batch (keep/update/delete + identify new)
  → Generate Updates for Each 'update' Rule
  → Analyze Description (careful consideration)
  → Create Patch with Rule-Level Changes
```

### New Patch Structure

```typescript
{
  patchType: 'UPDATE_STANDARD',
  proposedChanges: {
    description?: string,  // Rare - only when topic expands standard's scope
    rules: {
      toKeep: string[],      // ruleIds (for verification)
      toUpdate: Array<{ ruleId: string, newContent: string }>,
      toDelete: string[],    // ruleIds
      toAdd: Array<{ content: string }>  // No ordering - append at end
    }
  }
}
```

### UI Changes: Block-Based Diff View

Instead of unified diff, show separate collapsible blocks:

**Block 1: Standard Description** (if changed)

```
[Standard: Back-end Typescript]
  Description:
    - Old: "Establish clean code practices..."
    + New: "Establish clean code practices including type safety..."
```

**Block 2: Rules to Delete** (if any)

```
[Rules to Delete] (1)
  ❌ Rule #3: "Avoid excessive logger.debug calls..."
```

**Block 3: Rules to Update** (if any)

```
[Rules to Update] (2)
  📝 Rule #5: "Use dedicated error types..."
     - Old: "Use dedicated error types instead of Error"
     + New: "Use dedicated error types instead of generic Error instances"

  📝 Rule #2: "Keep imports at top..."
     - Old: "Keep all import statements at the top"
     + New: "Keep all import statements at the top of the file before any other code"
```

**Block 4: Rules to Add** (if any)

```
[New Rules] (1)
  ✨ "Avoid using 'any' type; prefer specific types or 'unknown' with type guards"
```

**Block 5: Unchanged Rules** (collapsed by default)

```
[Unchanged Rules] (4 rules)
  ▶ Click to expand...
```

---

## Implementation Plan

### Phase 1: Update Type Definitions & Contracts

**Subtask 1.1**: Define new StandardEditResult type structure

- Create new types for rule classification results
- Define structure: `{ description, rules: { toKeep, toUpdate, toDelete, toAdd } }`
- Update in DistillationService types

**Subtask 1.2**: Update KnowledgePatch proposedChanges structure (if needed)

- Ensure it can handle new rule-based format
- Document the new structure

---

### Phase 2: Create New Prompts (TDD - Write Tests First)

**Subtask 2.1**: Write tests for classifyStandardRules prompt

- Test: Returns keep/update/delete classification for each rule
- Test: Identifies rules to add based on topic
- Test: Handles empty rule sets
- Test: Handles no changes needed scenario

**Subtask 2.2**: Implement classifyStandardRules.prompt.ts

- Input: topic, standard context, all rules (id + content)
- Output: `Array<{ ruleId, action: 'keep'|'update'|'delete' }>` + `newRules: Array<{ content }>`
- Make tests pass

**Subtask 2.3**: Write tests for updateRule prompt

- Test: Generates updated rule content based on topic
- Test: Preserves rule intent while improving clarity
- Test: Handles edge cases (rule already perfect, etc.)

**Subtask 2.4**: Implement updateRule.prompt.ts

- Input: topic, standard context, specific rule
- Output: `{ updatedContent: string }`
- Make tests pass

**Subtask 2.5**: Write tests for analyzeStandardDescription prompt

- Test: Determines if description change needed
- Test: Generates appropriate description that encompasses all rules
- Test: Returns null when no change needed

**Subtask 2.6**: Implement analyzeStandardDescription.prompt.ts (or update existing)

- Input: topic, standard, all rules (including new/updated ones)
- Output: `{ description: string | null }`
- Emphasize careful consideration
- Make tests pass

---

### Phase 3: Refactor DistillationService (TDD)

**Subtask 3.1**: Write tests for new analyzeStandardEdit flow

- Test: Classifies rules correctly
- Test: Generates updates for rules marked 'update'
- Test: Analyzes description when needed
- Test: Handles standards with no changes
- Test: Combines all changes into proper structure

**Subtask 3.2**: Refactor analyzeStandardEdit() method

- Replace monolithic analysis with new flow:
  1. Fetch full standard with rules
  2. Call classifyStandardRules (single prompt)
  3. For each rule marked 'update', call updateRule prompt
  4. Call analyzeStandardDescription
  5. Build new StandardEditResult structure
- Make tests pass

**Subtask 3.3**: Update buildStandardDiffRepresentation()

- Adapt to new rule-based structure
- Build block-based diff format
- Write tests first, then implement

---

### Phase 4: Update PatchApplicationService (TDD)

**Subtask 4.1**: Write tests for new applyStandardUpdate flow

- Test: Updates description when provided
- Test: Keeps rules that should be kept (no-op verification)
- Test: Updates rules with new content
- Test: Deletes rules marked for deletion
- Test: Adds new rules
- Test: Handles combinations of all operations
- Test: Error scenarios (invalid ruleIds, etc.)

**Subtask 4.2**: Refactor applyStandardUpdate() method

- Update to handle new proposedChanges structure
- Process rules.toUpdate (update content)
- Process rules.toDelete
- Process rules.toAdd
- Remove old example-handling code (per earlier decision)
- Make tests pass

---

### Phase 5: Update UI Diff Component

**Subtask 5.1**: Identify current diff component

- Find where standard diffs are displayed
- Understand current rendering logic

**Subtask 5.2**: Design block-based UI structure

- Block 1: Standard description (if changed)
- Block 2: Rules to delete (if any)
- Block 3: Rules to update (if any)
- Block 4: Rules to add (if any)
- Block 5: Unchanged rules (collapsed, with count)

**Subtask 5.3**: Implement UI components

- Create/update components for each block type
- Use proper diff styling (red for delete, green for add, yellow for update)
- Implement collapse/expand for unchanged rules
- Follow @packmind/ui component standards

**Subtask 5.4**: Write UI component tests (if applicable)

- Test rendering of each block type
- Test collapse/expand behavior
- Test empty state handling

---

### Phase 6: Integration & Validation

**Subtask 6.1**: Run quality gate after each phase

- `npm run quality-gate`
- Fix any lint/test failures
- Commit after each subtask

**Subtask 6.2**: End-to-end manual testing

- Create a test topic
- Verify distillation produces correct patches
- Verify patch application works correctly
- Verify UI displays patches correctly

**Subtask 6.3**: Update documentation (if needed)

- Document new patch structure
- Update any relevant developer docs

---

## Validation Criteria

- ✅ All existing tests still pass
- ✅ All new tests pass
- ✅ `npm run quality-gate` succeeds
- ✅ Manual E2E test successful
- ✅ Recipes flow unchanged and working
- ✅ No TypeScript errors
- ✅ UI renders block-based diffs correctly

---

## Design Decisions

### 1. Standard Metadata Changes

- **Title**: Not updated during distillation (manual only)
- **Description**: Updated only when topic fundamentally expands standard's scope
- **Rationale**: Description should encompass ALL rules, not just the one being added/updated

### 2. Patch Granularity

- **Decision**: One patch per standard (contains both description + rule changes)
- **Rationale**: Simpler to manage, accept/reject as a unit

### 3. Rule Ordering

- **Decision**: No ordering for now - new rules appended at end
- **Future**: Could add ordering/positioning later

### 4. Code Examples

- **Decision**: Not handling code examples in this iteration
- **Rationale**: Focus on rule-level changes first, examples can be added later

### 5. Testing Approach

- **Decision**: TDD - write tests first, then implementation
- **Rationale**: Ensures robust refactor with clear behavior expectations

---

## Out of Scope

- ❌ Recipe distillation changes (keep as-is)
- ❌ Code example handling
- ❌ Rule ordering/positioning
- ❌ Standard title updates
- ❌ Multiple patches per standard (metadata vs rules)
- ❌ Creating new standards (existing flow OK)

---

## Key Files to Modify

### Backend

- `packages/learnings/src/application/services/DistillationService.ts`
- `packages/learnings/src/application/services/PatchApplicationService.ts`
- `packages/learnings/src/application/services/prompts/classifyStandardRules.prompt.ts` (NEW)
- `packages/learnings/src/application/services/prompts/updateRule.prompt.ts` (NEW)
- `packages/learnings/src/application/services/prompts/analyzeStandardDescription.prompt.ts` (NEW or update existing)

### Tests

- `packages/learnings/src/application/services/DistillationService.spec.ts`
- `packages/learnings/src/application/services/PatchApplicationService.spec.ts`
- Prompt test files (NEW)

### Frontend (UI)

- Find and update standard diff display components
- Create block-based rendering components

---

## Success Metrics

1. **Precision**: Patches target specific rules, not entire standards
2. **Clarity**: Diff view clearly shows what changed at rule level
3. **Performance**: Fewer LLM tokens used (only analyze rules that need updates)
4. **Maintainability**: Code is testable, modular, and follows DDD patterns
5. **User Experience**: Developers can easily review and accept/reject patches

---

## Notes

- This refactor improves the conceptual model: **topics affect rules, not standards**
- The new flow is more efficient (only update what's needed)
- Block-based UI provides better UX for reviewing changes
- TDD ensures we don't break existing functionality
- Recipe flow remains unchanged (already works well for their use case)
