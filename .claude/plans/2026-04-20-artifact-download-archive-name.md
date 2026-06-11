# Artifact Download Archive Name Implementation Plan

> **For agentic execution:** Use `packmind:architect-executor` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user directly downloads a rendered artifact from the change proposal page, name the downloaded `.zip` after the artifact's slug (fallback: slugified name) instead of the generic `preview`.

**Architecture:** Backend (`PreviewArtifactRenderingUseCase` in `packages/coding-agent`) computes the filename from the single artifact in the command and returns it in `PreviewArtifactRenderingResponse.fileName`. The existing NestJS controller already forwards this via `Content-Disposition`. The frontend (`DownloadAsAgentButton` in `apps/frontend`) switches from a hardcoded name to parsing `Content-Disposition`, with a fallback to the existing name if the header is missing.

**Tech Stack:** TypeScript, NestJS, Jest (`@swc/jest`), React 19, React Testing Library, `@packmind/ui`.

**Source Spec:** `.claude/specs/2026-04-20-artifact-download-archive-name-design.md`
**EM Spec:** None

---

### Task 1: Backend — filename uses artifact slug in `PreviewArtifactRenderingUseCase`

**Files:**
- Modify: `packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.ts`
- Modify: `packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.spec.ts`

- [ ] **Step 1: Update existing single-artifact test + add new cases to spec file**

Open `packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.spec.ts`.

At the top of the file (with the other fixtures), add a `SkillVersion` fixture. Import `SkillVersion`, `SkillVersionId`, `SkillId` from `@packmind/types`:

```typescript
import {
  FileUpdates,
  PreviewArtifactRenderingCommand,
  RecipeVersion,
  RecipeVersionId,
  RecipeId,
  StandardVersion,
  StandardVersionId,
  StandardId,
  SkillVersion,
  SkillVersionId,
  SkillId,
  UserId,
} from '@packmind/types';
```

And add the fixture near the existing `standardVersion` declaration:

```typescript
const skillVersion: SkillVersion = {
  id: 'skv-1' as SkillVersionId,
  skillId: 'sk-1' as SkillId,
  version: 1,
  userId: 'user-1' as UserId,
  name: 'Test Skill',
  slug: 'test-skill',
  description: 'A test skill',
  prompt: '# Skill prompt',
};
```

Replace the existing assertion inside `describe('when rendering a command for an agent')`'s first `it('returns a zip with the correct filename', ...)` (currently expects `'packmind-claude-preview.zip'`) with the slug-based filename:

```typescript
it('returns a zip with the correct filename', async () => {
  const command: PreviewArtifactRenderingCommand = {
    codingAgent: 'claude',
    recipeVersions: [recipeVersion],
    standardVersions: [],
    skillVersions: [],
  };

  const result = await useCase.execute(command);

  expect(result.fileName).toBe('packmind-claude-test-command.zip');
});
```

Add this new `describe` block immediately after that test, still inside `describe('execute')`:

```typescript
describe('filename computation', () => {
  beforeEach(() => {
    mockDeployer.deployArtifacts.mockResolvedValue({
      createOrUpdate: [],
      delete: [],
    });
  });

  it('uses the standard slug when the command carries a single standard', async () => {
    const result = await useCase.execute({
      codingAgent: 'claude',
      recipeVersions: [],
      standardVersions: [standardVersion],
      skillVersions: [],
    });

    expect(result.fileName).toBe('packmind-claude-test-standard.zip');
  });

  it('uses the skill slug when the command carries a single skill', async () => {
    const result = await useCase.execute({
      codingAgent: 'cursor',
      recipeVersions: [],
      standardVersions: [],
      skillVersions: [skillVersion],
    });

    expect(result.fileName).toBe('packmind-cursor-test-skill.zip');
  });

  it('slugifies the artifact name when slug is empty', async () => {
    const withEmptySlug: RecipeVersion = {
      ...recipeVersion,
      slug: '',
      name: 'My Cool Thing!',
    };

    const result = await useCase.execute({
      codingAgent: 'claude',
      recipeVersions: [withEmptySlug],
      standardVersions: [],
      skillVersions: [],
    });

    expect(result.fileName).toBe('packmind-claude-my-cool-thing.zip');
  });

  it('falls back to "preview" when both slug and name are empty', async () => {
    const emptyArtifact: RecipeVersion = {
      ...recipeVersion,
      slug: '',
      name: '',
    };

    const result = await useCase.execute({
      codingAgent: 'claude',
      recipeVersions: [emptyArtifact],
      standardVersions: [],
      skillVersions: [],
    });

    expect(result.fileName).toBe('packmind-claude-preview.zip');
  });

  it('falls back to "preview" when the command carries multiple artifacts', async () => {
    const result = await useCase.execute({
      codingAgent: 'claude',
      recipeVersions: [recipeVersion],
      standardVersions: [standardVersion],
      skillVersions: [],
    });

    expect(result.fileName).toBe('packmind-claude-preview.zip');
  });

  it('falls back to "preview" when the command carries no artifacts', async () => {
    const result = await useCase.execute({
      codingAgent: 'copilot',
      recipeVersions: [],
      standardVersions: [],
      skillVersions: [],
    });

    expect(result.fileName).toBe('packmind-copilot-preview.zip');
  });
});
```

- [ ] **Step 2: Run the backend tests and verify they fail**

Run: `./node_modules/.bin/nx test coding-agent --testFile=packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.spec.ts`

Expected: FAIL. The original `returns a zip with the correct filename` now expects `packmind-claude-test-command.zip` but implementation still returns `packmind-claude-preview.zip`. New `filename computation` tests should all fail for the same reason.

- [ ] **Step 3: Implement slug-based filename logic in the use case**

Open `packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.ts`. Replace the `const fileName = \`packmind-${codingAgent}-preview.zip\`;` line (currently line 56) with a call to a new private method, and add two helpers at the bottom of the class.

Updated `execute` body — replace the single `const fileName = ...` line with:

```typescript
    const fileName = this.computeFileName(codingAgent, command);
```

Add these private methods at the end of the class (before the closing brace):

```typescript
  private computeFileName(
    codingAgent: PreviewArtifactRenderingCommand['codingAgent'],
    command: PreviewArtifactRenderingCommand,
  ): string {
    const artifacts = [
      ...command.recipeVersions,
      ...command.standardVersions,
      ...command.skillVersions,
    ];

    if (artifacts.length !== 1) {
      return `packmind-${codingAgent}-preview.zip`;
    }

    const [artifact] = artifacts;
    const slug =
      artifact.slug && artifact.slug.length > 0
        ? artifact.slug
        : this.slugify(artifact.name);

    return `packmind-${codingAgent}-${slug}.zip`;
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug.length > 0 ? slug : 'preview';
  }
```

No other changes to this file — the zip creation, logging, and return shape stay identical.

- [ ] **Step 4: Run the backend tests and verify they pass**

Run: `./node_modules/.bin/nx test coding-agent --testFile=packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.spec.ts`

Expected: PASS — all tests in `PreviewArtifactRenderingUseCase.spec.ts`, including the updated single-artifact test and the new `filename computation` block.

- [ ] **Step 5: Lint the coding-agent package**

Run: `./node_modules/.bin/nx lint coding-agent`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.ts packages/coding-agent/src/application/useCases/PreviewArtifactRenderingUseCase.spec.ts
git commit -m "✨ feat(coding-agent): name preview archive after artifact slug"
```

---

### Task 2: Frontend — honor `Content-Disposition` in `DownloadAsAgentButton`

**Files:**
- Modify: `apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.tsx`
- Create: `apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.spec.tsx`

- [ ] **Step 1: Write the failing frontend test**

Create `apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.spec.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { DownloadAsAgentButton } from './DownloadAsAgentButton';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) =>
  render(<UIProvider>{component}</UIProvider>);

describe('DownloadAsAgentButton', () => {
  const getPreviewCommand = jest.fn().mockReturnValue({
    recipeVersions: [],
    standardVersions: [],
    skillVersions: [],
  });
  let clickSpy: jest.SpyInstance;
  let createObjectURLSpy: jest.SpyInstance;
  let revokeObjectURLSpy: jest.SpyInstance;
  let lastAnchor: HTMLAnchorElement | null;

  beforeEach(() => {
    (useAuthContext as jest.Mock).mockReturnValue({
      organization: { id: 'org-1' },
    });
    (useCurrentSpace as jest.Mock).mockReturnValue({ spaceId: 'space-1' });

    lastAnchor = null;
    const originalCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          lastAnchor = element as HTMLAnchorElement;
        }
        return element;
      });

    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    createObjectURLSpy = jest
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock');
    revokeObjectURLSpy = jest
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockFetchResponse = (contentDisposition: string | null) => {
    const headers = new Headers();
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    }
    const response = new Response(new Blob(['zip-bytes']), {
      status: 200,
      headers,
    });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
  };

  it('uses the filename from Content-Disposition when present', async () => {
    mockFetchResponse(
      'attachment; filename="packmind-claude-my-slug.zip"',
    );

    renderWithProviders(
      <DownloadAsAgentButton getPreviewCommand={getPreviewCommand} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /download for agent/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /claude/i }));

    await waitForAnchor(() => lastAnchor);
    expect(lastAnchor?.download).toBe('packmind-claude-my-slug.zip');
    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('falls back to the legacy name when Content-Disposition is missing', async () => {
    mockFetchResponse(null);

    renderWithProviders(
      <DownloadAsAgentButton getPreviewCommand={getPreviewCommand} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /download for agent/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /claude/i }));

    await waitForAnchor(() => lastAnchor);
    expect(lastAnchor?.download).toBe('packmind-claude-preview.zip');
  });

  it('falls back to the legacy name when Content-Disposition is malformed', async () => {
    mockFetchResponse('attachment; something-else');

    renderWithProviders(
      <DownloadAsAgentButton getPreviewCommand={getPreviewCommand} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /download for agent/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /claude/i }));

    await waitForAnchor(() => lastAnchor);
    expect(lastAnchor?.download).toBe('packmind-claude-preview.zip');
  });
});

async function waitForAnchor(get: () => HTMLAnchorElement | null) {
  await waitFor(() => {
    expect(get()).not.toBeNull();
  });
}
```

- [ ] **Step 2: Run the frontend test and verify it fails**

Run: `./node_modules/.bin/nx test frontend --testFile=apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.spec.tsx`

Expected: FAIL. The first test expects `packmind-claude-my-slug.zip`; the component still sets `a.download = \`packmind-claude-preview.zip\`` regardless of headers.

- [ ] **Step 3: Update the component to parse `Content-Disposition`**

Open `apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.tsx`.

Add a small file-local helper above the component:

```typescript
function parseFilenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null;
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match) return null;
  const value = match[1].trim();
  return value.length > 0 ? value : null;
}
```

Replace the download block inside `handleDownload` (currently lines ~66-72) with:

```typescript
      const blob = await response.blob();
      const fileName =
        parseFilenameFromContentDisposition(
          response.headers.get('Content-Disposition'),
        ) ?? `packmind-${agent}-preview.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
```

No other changes — the popover UI, `fetch` call, error handling, and loading state stay as is.

- [ ] **Step 4: Run the frontend test and verify it passes**

Run: `./node_modules/.bin/nx test frontend --testFile=apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.spec.tsx`

Expected: PASS — all three cases.

- [ ] **Step 5: Lint the frontend app**

Run: `./node_modules/.bin/nx lint frontend`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.tsx apps/frontend/src/domain/artifacts/components/DownloadAsAgentButton.spec.tsx
git commit -m "✨ feat(frontend): use server-provided filename for artifact download"
```

---

## Plan self-review notes

- **Spec coverage:** Backend filename logic covered by Task 1 (all six cases from the spec's testing section). Frontend `Content-Disposition` parsing covered by Task 2 (all three cases from the spec). No spec requirement left without a task.
- **Type consistency:** `computeFileName` and `slugify` method names match between the test expectations (filenames only — no direct method calls in tests) and the implementation. `parseFilenameFromContentDisposition` is used only internally by `DownloadAsAgentButton`.
- **Placeholders:** None — every step has concrete code or commands.
