# Space Creation Discoverability — Design Spec

**Goal:** Let users choose the space access type (open / restricted / private) when creating a space, instead of hardcoding `private`.
**Scope:** Modal UI change + full-stack wiring of `SpaceType` through the creation chain. No new entities, no migrations.

## Architecture

This is a threading change through existing layers. The `SpaceType` enum and `CreateSpaceCommand.type` field already exist — they just need to be wired end-to-end.

**Layers touched:**
- `apps/frontend` — `CreateSpaceDialog` component, gateway, mutation hook
- `packages/spaces-management` — controller, use case
- No changes to `packages/spaces` (the core domain already supports `type`)

## Data Model

No changes. `Space.type` already stores `SpaceType` (`open | restricted | private`), and `CreateSpaceCommand` already has `type?: SpaceType`.

## Frontend Surface

### CreateSpaceDialog changes

Add an "Access status" card selector below the space name field:

- **Three clickable cards** in a horizontal row, each with:
  - An icon (from `react-icons/lu`)
  - A title: "Open" / "Restricted" / "Private"
  - A short description (same meaning as `SpaceAccessSection`, adapted for card format):
    - Open: "Anyone can join"
    - Restricted: "Approval required to join"
    - Private: "Invite only"
- **Default selection:** `open`
- **Selected state:** highlighted border (primary color) + subtle background tint
- **Field label:** "Access status" (consistent with `SpaceAccessSection`)

### Gateway changes

- `ISpacesManagementGateway.createSpace` — change signature from `(orgId, name)` to `(orgId, name, type)`
- `SpacesManagementGatewayApi.createSpace` — send `{ name, type }` in POST body

### Mutation hook changes

- `useCreateSpaceMutation` — accept `{ name: string; type: SpaceType }` instead of `string`

## Backend Surface

### Controller changes

- `SpacesManagementController.createSpace` — extract `type` from request body alongside `name`
- Body type changes from `{ name: string }` to `{ name: string; type?: SpaceType }`
- The controller manually assembles the command object (`{ name, organizationId, userId }`). Must add `type` to this assembly: `{ name, type, organizationId, userId }`

### Use case changes

- `CreateSpaceUseCase.execute` (in `packages/spaces-management`) — currently does `type: SpaceType.private` in the spread to `spacesPort.createSpace`, which **overwrites** any `command.type` value. Change to use `command.type ?? SpaceType.open` so the provided type is respected, with `open` as the default fallback.
- Note: The `CreateSpaceUseCase` in `packages/spaces` (core domain) already correctly passes `command.type` through — no changes needed there.

## Testing Approach

### Backend
- **CreateSpaceUseCase.spec.ts** — update existing test ("creates the space with private type" → verify provided type is forwarded); add test for default `open` when type is omitted
- **SpacesManagementController.spec.ts** — update existing test to pass `type` in body and verify it's forwarded to service; add test for omitting type

### Frontend
- **CreateSpaceDialog.test.tsx** (new) — verify card selector renders, default is `open`, clicking a card changes selection, and submit sends the selected type

## Out of Scope

- Space settings page changes (already has its own `SpaceAccessSection`)
- Browse/join spaces discoverability (separate feature)
- Backend validation of `SpaceType` enum values (TypeORM handles this)
- Migration (no schema changes needed)
