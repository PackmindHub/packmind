# Artifact Download Archive Name — Design Spec

**Goal:** When directly downloading a rendered artifact from the change proposal page, name the downloaded `.zip` after the artifact's slug instead of the generic `preview`.

**Scope:**
- **In:** filename of the zip delivered by the `POST /change-proposals/preview-rendering` endpoint; frontend filename applied by `DownloadAsAgentButton`.
- **Out:** zip contents, agent deployer logic, any other download flows, any multi-artifact aggregated download path (no UI currently triggers it — current fallback preserved).

## Source
None (fresh idea).

## Architecture

Two touch points, one source of truth (backend).

- **Backend (`PreviewArtifactRenderingUseCase`, `packages/coding-agent`)** computes the archive filename from the command. When the command contains exactly one artifact across `recipeVersions` / `standardVersions` / `skillVersions`, use that artifact's `slug`. Fallback to the artifact's slugified `name` if `slug` is missing/empty. Otherwise (zero or multiple artifacts — no current UI path), fall back to the existing `packmind-${agent}-preview.zip` name.
- **Backend controller** already emits `Content-Disposition: attachment; filename="${result.fileName}"` — no change.
- **Frontend (`DownloadAsAgentButton`)** stops hardcoding the filename. It parses `Content-Disposition` from the response and uses its `filename` as `a.download`. If parsing fails (defensive), falls back to the existing hardcoded name.

## Data Model

No domain changes. Existing fields used:
- `RecipeVersion.slug: string`, `RecipeVersion.name: string`
- `StandardVersion.slug: string`, `StandardVersion.name: string`
- `SkillVersion.slug: string`, `SkillVersion.name: string`

## Use Cases / Services

### `PreviewArtifactRenderingUseCase.execute` — modified

Filename computation:

1. Collect the union of the three version arrays from the command.
2. If exactly **one** artifact: `slug = artifact.slug || slugify(artifact.name)`.
3. Filename: `packmind-${codingAgent}-${slug}.zip`.
4. Otherwise: `packmind-${codingAgent}-preview.zip` (unchanged).

Slugify helper (local to the use case file, private function):
- Lowercase.
- Replace any run of characters outside `[a-z0-9]` with a single `-`.
- Trim leading/trailing `-`.
- If the result is empty, return `"preview"`.

No new public API. No ports / no events / no DB.

## API / CLI / Frontend Surface

### Backend
- No change to request shape.
- No change to response shape (`PreviewArtifactRenderingResponse.fileName` already carries the filename).
- `Content-Disposition: attachment; filename="${result.fileName}"` — unchanged. The value is now slug-based.

### Frontend — `DownloadAsAgentButton`
- In `handleDownload`, after a successful `fetch`, read `response.headers.get('Content-Disposition')`.
- Extract the filename via a local parser handling both `filename="..."` and `filename=...` forms. Return the trimmed value or `null`.
- `a.download = parsedName ?? \`packmind-${agent}-preview.zip\``.

No change to component props, usage sites (`ArtifactResultFilePreview`, `CreationReviewHeader`), or the popover UI.

## Testing Approach

### Backend — `PreviewArtifactRenderingUseCase.spec.ts`
Update and add cases:
- Existing "returns a zip with the correct filename" (single recipe `test-command`, agent `claude`) — expected filename changes to `packmind-claude-test-command.zip`.
- New: single standard — `packmind-claude-test-standard.zip`.
- New: single skill — `packmind-${agent}-${skill-slug}.zip`.
- New: artifact with empty `slug` and `name: "My Cool Thing!"` — filename uses slugified name: `packmind-claude-my-cool-thing.zip`.
- New: artifact with empty `slug` and empty `name` — falls back to `packmind-claude-preview.zip`.
- Existing "when rendering multiple artifacts" — assert filename is `packmind-claude-preview.zip` (multi-artifact fallback explicit).
- Existing "gets the deployer for the correct agent" (zero artifacts) — assert filename is `packmind-copilot-preview.zip`.

### Frontend — `DownloadAsAgentButton.spec.tsx` (new file)
- When the server responds with `Content-Disposition: attachment; filename="packmind-claude-my-slug.zip"`, the anchor's `download` attribute is set to `packmind-claude-my-slug.zip`.
- When the response has no `Content-Disposition`, the anchor falls back to `packmind-claude-preview.zip`.
- When `Content-Disposition` is malformed (no `filename=` token), same fallback applies.

Use `fetch` mocking via `jest.spyOn(globalThis, 'fetch')` returning a `Response` with a blob body and the relevant header. Assert on a spied `HTMLAnchorElement.click` + the anchor's `download` attribute.

## Out of Scope

- Any download flow other than `preview-rendering`.
- Multi-artifact naming strategies (concatenation, zipped-of-zips, etc.).
- Renaming the files *inside* the zip.
- i18n / localization of the filename.
- Analytics events.
