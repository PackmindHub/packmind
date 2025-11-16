# Phase 4: Knowledge Patches Management UI - Implementation Plan

## Overview

Create a complete frontend UI and backend API for managing knowledge patches with diff visualization using CodeMirror, allowing users to review, accept, and reject patches generated from topic distillation. Add "Learnings" as a new sidebar menu item.

---

## Part 1: UI Package - Create PMDiffView Component

### 1.1 Install Dependencies

**Package**: `packages/ui`

```bash
npm install @codemirror/merge --workspace=packages/ui
```

### 1.2 Create PMDiffView Component

**Create folder**: `packages/ui/src/lib/components/form/PMDiffView/`

**Files to create:**

1. **PMDiffView.tsx**
   - Props interface:
     ```typescript
     export interface IPMDiffViewProps {
       original: string; // Original content
       modified: string; // Modified content
       language?: string; // Syntax highlighting language
       height?: string; // Component height (default: '400px')
       orientation?: 'a-b' | 'b-a'; // Diff direction
       highlightChanges?: boolean; // Enable change highlighting (default: true)
       readOnly?: boolean; // Lock editing (default: true)
     }
     ```
   - Use `@codemirror/merge` MergeView
   - Reuse language mapping from PMCodeMirror
   - Apply Dracula theme (consistent with PMCodeMirror)
   - Support unified diff view
   - Show line numbers
   - Highlight additions (green) and deletions (red)

2. **index.ts**
   - Export PMDiffView component and interface

3. **PMDiffView.stories.tsx** (optional for development)
   - Storybook stories showing different languages
   - Examples: markdown diff, typescript diff

### 1.3 Export from UI Package

**Update**: `packages/ui/src/lib/components/form/index.ts`

- Add: `export * from './PMDiffView';`

---

## Part 2: Backend API Endpoints

### 2.1 Fix Schema Export Bug

**File**: `packages/learnings/src/index.ts`

- Import `KnowledgePatchSchema`
- Update `learningsSchemas = [TopicSchema, KnowledgePatchSchema]`

### 2.2 Create Use Cases (Backend Domain Logic)

**Create 4 new use cases in `packages/learnings/src/application/useCases/`:**

1. **ListKnowledgePatches** (`listKnowledgePatches/listKnowledgePatches.usecase.ts`)
   - Command: `{ spaceId: SpaceId, status?: KnowledgePatchStatus }`
   - Response: `{ patches: KnowledgePatch[] }`
   - Logic: If status provided, filter by status; otherwise return all
   - Calls `repository.findBySpaceId()` or `repository.findPendingReview()`
   - Extends `AbstractMemberUseCase`
   - Tests: List all, list by status, empty results

2. **GetKnowledgePatch** (`getKnowledgePatch/getKnowledgePatch.usecase.ts`)
   - Command: `{ patchId: KnowledgePatchId }`
   - Response: `{ patch: KnowledgePatch }`
   - Calls `repository.findById()`
   - Throws error if not found
   - Extends `AbstractMemberUseCase`
   - Tests: Found, not found

3. **AcceptKnowledgePatch** (`acceptKnowledgePatch/acceptKnowledgePatch.usecase.ts`)
   - Command: `{ patchId: KnowledgePatchId, reviewedBy: UserId, reviewNotes?: string }`
   - Response: `{ patch: KnowledgePatch, applied: boolean }`
   - Logic:
     - Validate patch status is PENDING_REVIEW
     - Apply changes via StandardsPort/RecipesPort based on patchType
     - Update patch: status=ACCEPTED, reviewedBy, reviewedAt=now(), reviewNotes
     - Save updated patch
   - Extends `AbstractMemberUseCase`
   - Tests: Accept new standard, accept update recipe, already reviewed error, not found error

4. **RejectKnowledgePatch** (`rejectKnowledgePatch/rejectKnowledgePatch.usecase.ts`)
   - Command: `{ patchId: KnowledgePatchId, reviewedBy: UserId, reviewNotes: string }`
   - Response: `{ patch: KnowledgePatch }`
   - Logic:
     - Validate patch status is PENDING_REVIEW
     - Validate reviewNotes is not empty
     - Update patch: status=REJECTED, reviewedBy, reviewedAt=now(), reviewNotes
     - Save updated patch
   - Extends `AbstractMemberUseCase`
   - Tests: Reject with notes, missing notes error, already reviewed error

**Create contracts in `packages/types/src/learnings/contracts/`:**

- `ListKnowledgePatchesUseCase.ts`
- `GetKnowledgePatchUseCase.ts`
- `AcceptKnowledgePatchUseCase.ts`
- `RejectKnowledgePatchUseCase.ts`
- Update `index.ts` to export all

**Update `packages/learnings/src/application/adapter/LearningsAdapter.ts`:**

- Add 4 new methods implementing use cases
- Inject use cases in constructor

**Update `packages/types/src/learnings/ports/ILearningsPort.ts`:**

- Add method signatures for all 4 use cases

### 2.3 Create NestJS API Module

**Create folder**: `apps/api/src/app/organizations/spaces/learnings/`

1. **learnings.controller.ts**
   - Decorator: `@Controller()` (path inherited from RouterModule)
   - Guards: `@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)`
   - Inject: `@InjectHexa(LearningsHexa) private learningsHexa`

   **Endpoints:**
   - `@Get('patches')` → `listPatches(@Query('status') status?, @Param() params, @Request() req)`
     - Extract spaceId from params, status from query
     - Call `learningsAdapter.listKnowledgePatches({ spaceId, status })`
   - `@Get('patches/:patchId')` → `getPatch(@Param('patchId') patchId)`
     - Call `learningsAdapter.getKnowledgePatch({ patchId })`
   - `@Post('patches/:patchId/accept')` → `acceptPatch(@Param('patchId') patchId, @Body() body, @Request() req)`
     - Extract userId from req.user
     - Body: `{ reviewNotes?: string }`
     - Call `learningsAdapter.acceptKnowledgePatch({ patchId, reviewedBy: userId, reviewNotes })`
   - `@Post('patches/:patchId/reject')` → `rejectPatch(@Param('patchId') patchId, @Body() body, @Request() req)`
     - Extract userId from req.user
     - Body: `{ reviewNotes: string }` (required)
     - Validate reviewNotes is present
     - Call `learningsAdapter.rejectKnowledgePatch({ patchId, reviewedBy: userId, reviewNotes })`

2. **learnings.module.ts**
   ```typescript
   @Module({
     imports: [LearningsModule],
     controllers: [OrganizationsSpacesLearningsController],
     providers: [OrganizationAccessGuard, SpaceAccessGuard, PackmindLogger],
   })
   export class OrganizationsSpacesLearningsModule {}
   ```

### 2.4 Register in App Module

**File**: `apps/api/src/app/app.module.ts`

- Import: `learningsSchemas, LearningsHexa` from `@packmind/learnings`
- Add to TypeORM entities: `[...learningsSchemas, ...otherSchemas]`
- Add to HexaRegistryModule: `hexas: [LearningsHexa, ...]`
- Add to RouterModule children (under spaces):
  ```typescript
  {
    path: ':spaceId/learnings',
    module: OrganizationsSpacesLearningsModule,
  }
  ```

---

## Part 3: Frontend Implementation

### 3.1 Create Domain API Layer

**Create folder**: `apps/frontend/src/domain/learnings/`

1. **api/queryKeys.ts**

   ```typescript
   import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
   import { SPACES_SCOPE } from '../../spaces/api/queryKeys';

   export const LEARNINGS_QUERY_SCOPE = 'learnings';

   export enum LearningsQueryKeys {
     LIST_PATCHES = 'list-patches',
     GET_PATCH = 'get-patch',
   }

   export function getKnowledgePatchesKey(
     spaceId: SpaceId | undefined,
     status?: string,
   ) {
     return [
       ORGANIZATION_QUERY_SCOPE,
       SPACES_SCOPE,
       spaceId,
       LEARNINGS_QUERY_SCOPE,
       LearningsQueryKeys.LIST_PATCHES,
       status,
     ];
   }

   export function getKnowledgePatchKey(patchId: KnowledgePatchId | undefined) {
     return [
       ORGANIZATION_QUERY_SCOPE,
       SPACES_SCOPE,
       LEARNINGS_QUERY_SCOPE,
       LearningsQueryKeys.GET_PATCH,
       patchId,
     ];
   }
   ```

2. **api/gateways/ILearningsGateway.ts**

   ```typescript
   export interface ILearningsGateway {
     listPatches(
       organizationId: OrganizationId,
       spaceId: SpaceId,
       status?: KnowledgePatchStatus,
     ): Promise<KnowledgePatch[]>;

     getPatch(
       organizationId: OrganizationId,
       spaceId: SpaceId,
       patchId: KnowledgePatchId,
     ): Promise<KnowledgePatch>;

     acceptPatch(
       organizationId: OrganizationId,
       spaceId: SpaceId,
       patchId: KnowledgePatchId,
       reviewNotes?: string,
     ): Promise<KnowledgePatch>;

     rejectPatch(
       organizationId: OrganizationId,
       spaceId: SpaceId,
       patchId: KnowledgePatchId,
       reviewNotes: string,
     ): Promise<KnowledgePatch>;
   }
   ```

3. **api/gateways/LearningsGatewayApi.ts**

   ```typescript
   export class LearningsGatewayApi
     extends PackmindGateway
     implements ILearningsGateway
   {
     constructor() {
       super('/learnings');
     }

     async listPatches(orgId, spaceId, status?) {
       const url = `/organizations/${orgId}/spaces/${spaceId}/learnings/patches`;
       const params = status ? { status } : {};
       return this._api.get<KnowledgePatch[]>(url, { params });
     }

     // Similar implementations for getPatch, acceptPatch, rejectPatch
   }
   ```

4. **api/gateways/index.ts**

   ```typescript
   export * from './ILearningsGateway';
   export * from './LearningsGatewayApi';
   export const learningsGateway = new LearningsGatewayApi();
   ```

5. **api/queries/LearningsQueries.ts**

   ```typescript
   export const useGetKnowledgePatchesQuery = (
     spaceId: SpaceId,
     status?: KnowledgePatchStatus,
   ) => {
     const { organization } = useAuthContext();
     return useQuery({
       queryKey: getKnowledgePatchesKey(spaceId, status),
       queryFn: () =>
         learningsGateway.listPatches(organization.id, spaceId, status),
       enabled: !!spaceId,
     });
   };

   export const useGetKnowledgePatchQuery = (patchId: KnowledgePatchId) => {
     // Similar implementation
   };
   ```

6. **api/mutations/LearningsMutations.ts**

   ```typescript
   export const useAcceptPatchMutation = () => {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: ({ orgId, spaceId, patchId, notes }) =>
         learningsGateway.acceptPatch(orgId, spaceId, patchId, notes),
       onSuccess: (_, variables) => {
         // Invalidate patches list
         queryClient.invalidateQueries({
           queryKey: getKnowledgePatchesKey(variables.spaceId),
         });
         // Invalidate single patch
         queryClient.invalidateQueries({
           queryKey: getKnowledgePatchKey(variables.patchId),
         });
       },
     });
   };

   // Similar for useRejectPatchMutation
   ```

### 3.2 Create UI Components

**Create folder**: `apps/frontend/src/domain/learnings/components/`

1. **KnowledgePatchesList.tsx**
   - Uses `PMTable` with columns:
     - Type (PatchTypeBadge component)
     - Target (standard/recipe name from proposedChanges)
     - Status (badge with color)
     - Created At (formatted date)
     - Actions (View button, quick Accept/Reject for pending)
   - Filter tabs: All | Pending | Accepted | Rejected
   - State: `const [statusFilter, setStatusFilter] = useState('pending')`
   - Query: `useGetKnowledgePatchesQuery(spaceId, statusFilter)`
   - Empty state with `PMEmptyState`: "No knowledge patches found"
   - Click row → navigate to detail page

2. **KnowledgePatchCard.tsx**
   - Metadata card using `PMBox`, `PMVStack`
   - Display:
     - Patch type badge (large)
     - Target artifact name
     - Rationale (from proposedChanges.rationale)
     - Topic ID (link to topic if available)
     - Status badge
     - Review metadata (if status !== PENDING_REVIEW):
       - Reviewed by (user name/ID)
       - Reviewed at (formatted datetime)
       - Review notes (if present)
   - Styling: Border, padding, background color

3. **KnowledgePatchDiff.tsx**
   - Uses `PMDiffView` component from `@packmind/ui`
   - Props: `patch: KnowledgePatch`
   - Logic to extract original/modified from proposedChanges:
     - For UPDATE_STANDARD/UPDATE_RECIPE: Show before/after diff
     - For NEW_STANDARD/NEW_RECIPE: Show empty → full content
   - Language: 'markdown' (standards/recipes are markdown)
   - Height: '600px' or dynamic
   - Read-only: true

4. **PatchTypeBadge.tsx**
   - Simple component using `PMBadge`
   - Props: `type: KnowledgePatchType, size?: 'sm' | 'md' | 'lg'`
   - Color mapping:
     - NEW_STANDARD: green
     - UPDATE_STANDARD: blue
     - NEW_RECIPE: green
     - UPDATE_RECIPE: blue
   - Icon: `LuFilePlus` (new) or `LuFileEdit` (update) from `react-icons/lu`
   - Text: "New Standard", "Update Recipe", etc.

5. **ReviewPatchDialog.tsx**
   - Uses `PMAlertDialog`
   - Props:
     ```typescript
     {
       isOpen: boolean;
       onClose: () => void;
       patchId: KnowledgePatchId;
       action: 'accept' | 'reject';
       onSuccess?: () => void;
     }
     ```
   - State: `const [notes, setNotes] = useState('')`
   - Mutations: `useAcceptPatchMutation()`, `useRejectPatchMutation()`
   - Accept mode:
     - Title: "Accept this knowledge patch?"
     - Optional notes textarea
     - Confirm button: "Accept"
   - Reject mode:
     - Title: "Reject this knowledge patch"
     - Required notes textarea (validation)
     - Confirm button: "Reject"
   - On confirm: Call mutation, show loading, close on success
   - Error handling: Show error alert

### 3.3 Create Routes

**Create routes in**: `apps/frontend/app/routes/`

1. **org.$orgSlug._protected.space.$spaceSlug.\_space-protected.learnings.tsx**

   ```tsx
   export const handle = {
     crumb: ({ params }) => (
       <NavLink to={routes.space.toLearnings(params.orgSlug, params.spaceSlug)}>
         Learnings
       </NavLink>
     ),
   };

   export default function LearningsRouteModule() {
     return <Outlet />;
   }
   ```

2. **org.$orgSlug._protected.space.$spaceSlug.\_space-protected.learnings.\_index.tsx**

   ```tsx
   export async function clientLoader({ params }) {
     const queryClient = getQueryClient();
     await queryClient.prefetchQuery({
       queryKey: getKnowledgePatchesKey(spaceId, 'pending_review'),
       queryFn: () =>
         learningsGateway.listPatches(orgId, spaceId, 'pending_review'),
     });
     return null;
   }

   export default function LearningsIndexRouteModule() {
     return (
       <PMPage title="Learnings" breadcrumbComponent={<AutobreadCrumb />}>
         <KnowledgePatchesList />
       </PMPage>
     );
   }
   ```

3. **org.$orgSlug._protected.space.$spaceSlug.\_space-protected.learnings.patches.$patchId.tsx**

   ```tsx
   export async function clientLoader({ params }) {
     // Prefetch patch
   }

   export const handle = {
     crumb: ({ data }) => <span>{data?.patch?.patchType}</span>,
   };

   export default function PatchDetailRouteModule() {
     const { patchId } = useParams();
     const { data } = useGetKnowledgePatchQuery(patchId);
     const [dialogState, setDialogState] = useState({
       open: false,
       action: null,
     });

     return (
       <PMPage title="Knowledge Patch" breadcrumbComponent={<AutobreadCrumb />}>
         <PMHStack gap={4}>
           {/* Left column: Diff viewer */}
           <PMBox flex={2}>
             <KnowledgePatchDiff patch={data.patch} />
           </PMBox>

           {/* Right column: Metadata + actions */}
           <PMBox flex={1}>
             <PMVStack gap={4}>
               <KnowledgePatchCard patch={data.patch} />

               {data.patch.status === 'PENDING_REVIEW' && (
                 <PMHStack gap={2}>
                   <PMButton
                     colorScheme="green"
                     onClick={() =>
                       setDialogState({ open: true, action: 'accept' })
                     }
                   >
                     Accept
                   </PMButton>
                   <PMButton
                     colorScheme="red"
                     onClick={() =>
                       setDialogState({ open: true, action: 'reject' })
                     }
                   >
                     Reject
                   </PMButton>
                 </PMHStack>
               )}
             </PMVStack>
           </PMBox>
         </PMHStack>

         <ReviewPatchDialog
           isOpen={dialogState.open}
           action={dialogState.action}
           patchId={patchId}
           onClose={() => setDialogState({ open: false, action: null })}
         />
       </PMPage>
     );
   }
   ```

### 3.4 Update Shared Navigation

**File**: `apps/frontend/src/shared/utils/routes.ts`

- Add to `space` object:
  ```typescript
  toLearnings: (orgSlug: string, spaceSlug: string) =>
    `/org/${orgSlug}/space/${spaceSlug}/learnings`,
  ```

**File**: `apps/frontend/src/domain/organizations/components/SidebarNavigation.tsx`

- Import: `import { LuHouse, LuSettings, LuLightbulb } from 'react-icons/lu';`
- Update "Knowledge base" section (line ~99):
  ```tsx
  <PMVerticalNavSection
    title="Knowledge base"
    navEntries={[
      <SidebarNavigationLink
        key="learnings"
        url={routes.space.toLearnings(orgSlug, currentSpaceSlug)}
        label="Learnings"
        icon={<LuLightbulb />}
      />,
      <SidebarNavigationLink
        key="standards"
        url={routes.space.toStandards(orgSlug, currentSpaceSlug)}
        label="Standards"
      />,
      <SidebarNavigationLink
        key="recipes"
        url={routes.space.toRecipes(orgSlug, currentSpaceSlug)}
        label="Recipes"
      />,
    ]}
  />
  ```

---

## Part 4: Testing

### 4.1 Backend Tests

- Create test file for each use case (4 files)
- Use `knowledgePatchFactory` from `packages/learnings/test/`
- Mock repositories using `jest.mocked()`
- Mock ports (StandardsPort, RecipesPort) for AcceptKnowledgePatch
- Follow standards:
  - Assertive test names: `it('returns all patches for space')`
  - Use `stubLogger()` for logger mocks
  - One expect per test
  - Use `afterEach(() => jest.clearAllMocks())`

### 4.2 Manual Testing Flow

1. Start API and frontend
2. Navigate to Learnings via sidebar
3. Verify patches list loads (use pending filter)
4. Click patch → view detail with diff
5. Click Accept → verify dialog, submit → verify success
6. Verify list updates (patch disappears from pending)
7. Switch to "Accepted" filter → verify patch appears
8. Test reject flow similarly

---

## Part 5: Commits Strategy

### Commit 1: UI Package - Create PMDiffView

- Install `@codemirror/merge`
- Create PMDiffView component
- Export from @packmind/ui
- Test with Storybook stories
- **Commit message**: `✨ Add PMDiffView component for CodeMirror diff visualization`

### Commit 2: Backend - Fix schema export & create use cases

- Fix learningsSchemas export
- Create 4 use cases with tests
- Create contracts in @packmind/types
- Update LearningsAdapter and ILearningsPort
- **Commit message**: `✨ Add knowledge patch management use cases`

### Commit 3: Backend - Create NestJS API module

- Create controller and module
- Register in AppModule
- Wire routes and guards
- **Commit message**: `🔌 Add learnings API endpoints for patch management`

### Commit 4: Frontend - Create API layer

- Create gateways, queries, mutations
- Create query keys
- **Commit message**: `🔧 Add learnings domain API layer with queries and mutations`

### Commit 5: Frontend - Create UI components and list view

- Create 5 components (list, card, diff, badge, dialog)
- Create list route
- Update sidebar navigation
- Update routes utility
- **Commit message**: `✨ Add learnings UI with knowledge patches list view`

### Commit 6: Frontend - Create detail view with review actions

- Create detail route
- Wire accept/reject functionality
- Test complete flow
- **Commit message**: `✨ Add knowledge patch detail view with review actions`

### Quality Gate (Before Each Commit)

- Run `npm run quality-gate` → must pass
- Ensure `PACKMIND_EDITION=oss`
- Manual browser test (no console errors)
- Ask permission before committing

---

## Success Criteria

✅ PMDiffView component created and working with CodeMirror merge  
✅ Schema export bug fixed - both schemas registered  
✅ 4 backend use cases implemented with tests  
✅ NestJS API endpoints working  
✅ Sidebar shows "Learnings" as first item in Knowledge base section  
✅ Users can view filterable patches table  
✅ Users can view diff preview using PMDiffView  
✅ Users can accept patches (applies changes)  
✅ Users can reject patches with notes  
✅ Cache invalidation works correctly  
✅ All tests pass, no linting errors  
✅ Follows all Packmind standards

---

## Dependencies on Previous Phases

**Required from Phase 3:**

- DistillTopic use case must be complete and creating KnowledgePatch entities
- StandardsPort and RecipesPort must be available for applying patches
- KnowledgePatchSchema must be fully defined with all fields

**Assumptions:**

- Phase 3 soft-deletes topics after distillation
- proposedChanges JSONB contains structured data for each patch type
- diffPreview is a human-readable text diff generated during distillation
