import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { createSpaceId } from '@packmind/types';

import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import {
  useGetSkillsQuery,
  useUploadSkillMutation,
} from '../api/queries/SkillsQueries';
import { SkillsUploadPanel } from './SkillsUploadPanel';
import type { Mock, MockedFunction } from 'vitest';

vi.mock('../api/queries/SkillsQueries', () => ({
  useGetSkillsQuery: vi.fn(),
  useUploadSkillMutation: vi.fn(),
}));

vi.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: vi.fn(),
}));

const mockUseGetSkillsQuery = useGetSkillsQuery as MockedFunction<
  typeof useGetSkillsQuery
>;
const mockUseUploadSkillMutation = useUploadSkillMutation as MockedFunction<
  typeof useUploadSkillMutation
>;
const mockUseCurrentSpace = useCurrentSpace as MockedFunction<
  typeof useCurrentSpace
>;

/**
 * A File shaped the way the directory picker hands it over.
 *
 * A SKILL.md declares a name in its frontmatter, and that name — not the folder
 * — is the skill's identity. It defaults to the containing folder so the common
 * case reads naturally; pass `declaredName` to make the two diverge.
 */
function pickedFile(relativePath: string, declaredName?: string): File {
  const segments = relativePath.split('/');
  const isManifest = segments[segments.length - 1] === 'SKILL.md';
  const name = declaredName ?? segments[segments.length - 2] ?? 'skill';
  const content = isManifest
    ? `---\nname: ${name}\ndescription: A skill.\n---\n\nBody.\n`
    : 'supporting content\n';

  const file = new File([content], segments[segments.length - 1]);
  Object.defineProperty(file, 'webkitRelativePath', {
    value: relativePath,
    configurable: true,
  });
  return file;
}

type RenderOptions = {
  existingSkills?: { name: string }[];
  uploadSkill?: Mock;
};

function renderPanel({
  existingSkills = [],
  uploadSkill = vi.fn().mockResolvedValue({}),
}: RenderOptions = {}) {
  mockUseCurrentSpace.mockReturnValue({
    spaceId: createSpaceId('space-1'),
  } as unknown as ReturnType<typeof useCurrentSpace>);

  mockUseGetSkillsQuery.mockReturnValue({
    data: existingSkills,
  } as unknown as ReturnType<typeof useGetSkillsQuery>);

  mockUseUploadSkillMutation.mockReturnValue({
    mutateAsync: uploadSkill,
  } as unknown as ReturnType<typeof useUploadSkillMutation>);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueries = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue(undefined);

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <SkillsUploadPanel />
      </UIProvider>
    </QueryClientProvider>,
  );

  return { ...rendered, uploadSkill, invalidateQueries };
}

/**
 * Drives the panel's hidden directory input the way a real pick would: jsdom
 * cannot open a file dialog, so `files` is planted on the element and both
 * events a browser would emit are dispatched.
 */
async function selectFiles(
  container: HTMLElement,
  files: File[],
  /**
   * Row labels to wait for. Resolving a selection reads each SKILL.md, so a
   * previous selection's rows are still on screen while that runs — waiting for
   * "a list exists" would let an assertion race the new one into place.
   */
  expectedRows?: string[],
) {
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });

  fireEvent.input(input);
  fireEvent.change(input);

  await waitFor(() => {
    const labels = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
    expect(labels.length).toBeGreaterThan(0);
    for (const [index, name] of (expectedRows ?? []).entries()) {
      expect(labels[index] ?? '').toContain(name);
    }
  });
}

const importButton = () => screen.getByRole('button', { name: /^import$/i });
const cancelButton = () =>
  screen.queryByRole('button', { name: /cancel import/i });

describe('SkillsUploadPanel', () => {
  afterEach(() => vi.clearAllMocks());

  describe('when nothing is selected', () => {
    it('invites the user to drop a folder', () => {
      renderPanel();

      expect(screen.getByText(/drag a folder/i)).toBeInTheDocument();
    });

    it('disables the import action', () => {
      renderPanel();

      expect(importButton()).toBeDisabled();
    });

    it('lists no skill', () => {
      renderPanel();

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('when a folder of skills is selected', () => {
    /**
     * Both fixtures are a SKILL.md of identical size and type on purpose — that
     * is the shape a name+size de-duplicating file input silently collapses
     * into one skill. Keep them identical.
     */
    it('lists every detected skill', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
        pickedFile('skills/onboarding/SKILL.md'),
      ]);

      expect(
        screen.getAllByRole('listitem').map((item) => item.textContent),
      ).toEqual([
        expect.stringContaining('documentation'),
        expect.stringContaining('onboarding'),
      ]);
    });

    it('enables the import action', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);

      expect(importButton()).toBeEnabled();
    });
  });

  describe('when a folder is dropped', () => {
    /** Fakes the entries a real drop exposes, which jsdom does not implement. */
    function dropWithFolder(target: Element, paths: string[]) {
      const items = paths.map((path) => ({
        kind: 'file',
        webkitGetAsEntry: () => ({
          isFile: true,
          isDirectory: false,
          fullPath: `/${path}`,
          file: (cb: (file: File) => void) =>
            cb(new File(['x'], path.split('/').pop() as string)),
        }),
      }));

      fireEvent.drop(target, { dataTransfer: { items } });
    }

    it('lists the skills found in the dropped folder', async () => {
      renderPanel();

      dropWithFolder(screen.getByText(/drag a folder/i), [
        'documentation/SKILL.md',
        'documentation/references/guide.md',
      ]);

      expect(await screen.findByRole('listitem')).toHaveTextContent(
        'documentation',
      );
    });
  });

  describe('when every detected skill is invalid', () => {
    it('disables the import action', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [pickedFile('skills/broken/readme.md')]);

      expect(importButton()).toBeDisabled();
    });

    it('shows why the skill cannot be imported', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [pickedFile('skills/broken/readme.md')]);

      expect(screen.getByText('SKILL.md is missing')).toBeInTheDocument();
    });
  });

  describe('when a folder declares a name other than its own', () => {
    it('shows the name the skill will actually have', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/folder-alpha/SKILL.md', 'declared-beta'),
      ]);

      expect(
        screen.getAllByRole('listitem').map((item) => item.textContent),
      ).toEqual([expect.stringContaining('declared-beta')]);
    });

    it('checks that declared name against the space, not the folder', async () => {
      const { container, uploadSkill } = renderPanel({
        existingSkills: [{ name: 'declared-beta' }],
      });

      await selectFiles(container, [
        pickedFile('skills/folder-alpha/SKILL.md', 'declared-beta'),
      ]);
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      expect(uploadSkill).not.toHaveBeenCalled();
    });
  });

  describe('when two selected folders declare the same skill name', () => {
    const clashing = () => [
      pickedFile('skills/copy-a/SKILL.md', 'shared-name'),
      pickedFile('skills/copy-b/SKILL.md', 'shared-name'),
    ];

    it('reports the clash on both of them', async () => {
      const { container } = renderPanel();

      await selectFiles(container, clashing());

      expect(
        screen.getAllByText(/more than one selected folder declares/i),
      ).toHaveLength(2);
    });

    /**
     * The endpoint resolves a skill by its declared name, so importing both
     * would create one skill, silently overwrite it with the second, and report
     * two successes. Neither side may go through.
     */
    it('imports neither of them', async () => {
      const { container } = renderPanel();

      await selectFiles(container, clashing());

      expect(importButton()).toBeDisabled();
    });

    it('still imports an unrelated skill in the same selection', async () => {
      const { container, uploadSkill } = renderPanel();

      await selectFiles(container, [
        ...clashing(),
        pickedFile('skills/unrelated/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      expect(uploadSkill).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a detected skill already exists in the space', () => {
    it('reports the conflict as soon as it is selected', async () => {
      const { container } = renderPanel({
        existingSkills: [{ name: 'onboarding' }],
      });

      await selectFiles(
        container,
        [pickedFile('skills/onboarding/SKILL.md')],
        ['onboarding'],
      );

      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    it('does not upload it', async () => {
      const { container, uploadSkill } = renderPanel({
        existingSkills: [{ name: 'onboarding' }],
      });

      await selectFiles(container, [
        pickedFile('skills/onboarding/SKILL.md'),
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      expect(uploadSkill).toHaveBeenCalledTimes(1);
    });

    it('still imports the skills that do not conflict', async () => {
      const { container } = renderPanel({
        existingSkills: [{ name: 'onboarding' }],
      });

      await selectFiles(container, [
        pickedFile('skills/onboarding/SKILL.md'),
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      expect(
        await screen.findByText('1 imported, 1 failed'),
      ).toBeInTheDocument();
    });
  });

  describe('when the import partly succeeds', () => {
    it('summarises what happened', async () => {
      const uploadSkill = vi
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Invalid frontmatter'));
      const { container } = renderPanel({ uploadSkill });

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
        pickedFile('skills/onboarding/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      expect(
        await screen.findByText('1 imported, 1 failed'),
      ).toBeInTheDocument();
    });

    it('shows the reason the failed skill failed', async () => {
      const uploadSkill = vi
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Invalid frontmatter'));
      const { container } = renderPanel({ uploadSkill });

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
        pickedFile('skills/onboarding/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      expect(
        await screen.findByText('Invalid frontmatter'),
      ).toBeInTheDocument();
    });
  });

  describe('when the whole import succeeds', () => {
    it('uploads the files of each detected skill', async () => {
      const { container, uploadSkill } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      await waitFor(() =>
        expect(uploadSkill).toHaveBeenCalledWith({
          files: [
            expect.objectContaining({ path: 'SKILL.md', isBase64: false }),
          ],
          // Carried on every upload so the batch can be cancelled mid-request.
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('summarises the result', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      expect(
        await screen.findByText('1 imported, 0 failed'),
      ).toBeInTheDocument();
    });

    it('stops telling the user to stay once the batch has settled', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');

      expect(
        screen.queryByText(/keep this page open/i),
      ).not.toBeInTheDocument();
    });

    it('offers no cancel once there is nothing left to stop', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');

      expect(cancelButton()).not.toBeInTheDocument();
    });
  });

  describe('while the import is running', () => {
    /** An upload that only settles when the batch's signal is aborted. */
    const cancellableUpload = () =>
      vi.fn(
        ({ signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(new Error('canceled')),
            );
          }),
      );

    it('tells the user not to leave the page', async () => {
      const { container } = renderPanel({ uploadSkill: cancellableUpload() });

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      expect(
        await screen.findByText(/keep this page open/i),
      ).toBeInTheDocument();
    });

    it('warns the browser before it unloads', async () => {
      const { container } = renderPanel({ uploadSkill: cancellableUpload() });

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText(/keep this page open/i);

      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('offers a cancel', async () => {
      const { container } = renderPanel({ uploadSkill: cancellableUpload() });

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());

      await waitFor(() => expect(cancelButton()).toBeInTheDocument());
    });

    it('reports the skills it did not import as cancelled', async () => {
      const { container } = renderPanel({ uploadSkill: cancellableUpload() });

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
        pickedFile('skills/onboarding/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await waitFor(() => expect(cancelButton()).toBeInTheDocument());
      await userEvent.click(cancelButton() as HTMLElement);

      expect(
        await screen.findByText('0 imported, 0 failed, 2 cancelled'),
      ).toBeInTheDocument();
    });
  });

  describe('once an import has finished', () => {
    it('disables the import action', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');

      expect(importButton()).toBeDisabled();
    });

    it('cannot upload the same selection twice', async () => {
      const { container, uploadSkill } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');
      await userEvent.click(importButton());

      expect(uploadSkill).toHaveBeenCalledTimes(1);
    });

    describe('when the batch had a failure', () => {
      it('still disables the import action, so a retry goes through a fresh selection', async () => {
        const { container } = renderPanel({
          uploadSkill: vi.fn().mockRejectedValue(new Error('Invalid')),
        });

        await selectFiles(container, [
          pickedFile('skills/documentation/SKILL.md'),
        ]);
        await userEvent.click(importButton());
        await screen.findByText('0 imported, 1 failed');

        expect(importButton()).toBeDisabled();
      });
    });

    describe('when another folder is selected afterwards', () => {
      it('enables the import action again', async () => {
        const { container } = renderPanel();

        await selectFiles(container, [
          pickedFile('skills/documentation/SKILL.md'),
        ]);
        await userEvent.click(importButton());
        await screen.findByText('1 imported, 0 failed');
        await selectFiles(
          container,
          [pickedFile('skills/onboarding/SKILL.md')],
          ['onboarding'],
        );

        expect(importButton()).toBeEnabled();
      });
    });
  });

  describe('when refreshing the skills list', () => {
    /**
     * Invalidating as soon as the import finishes swaps the page's blank state
     * for the skills table, and the blank state owns the dialog this panel lives
     * in — the results would vanish the instant they appeared.
     */
    it('leaves the list alone while the results are on screen', async () => {
      const { container, invalidateQueries } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');

      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('refreshes it once the panel goes away', async () => {
      const { container, invalidateQueries, unmount } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');
      unmount();

      expect(invalidateQueries).toHaveBeenCalledTimes(1);
    });

    describe('when no import was run', () => {
      it('does not refresh it on unmount', async () => {
        const { container, invalidateQueries, unmount } = renderPanel();

        await selectFiles(container, [
          pickedFile('skills/documentation/SKILL.md'),
        ]);
        unmount();

        expect(invalidateQueries).not.toHaveBeenCalled();
      });
    });
  });

  describe('when a folder is enumerated out of alphabetical order', () => {
    it('lists the skills sorted by name', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/onboarding/SKILL.md'),
        pickedFile('skills/documentation/SKILL.md'),
      ]);

      expect(
        screen.getAllByRole('listitem').map((item) => item.textContent),
      ).toEqual([
        expect.stringContaining('documentation'),
        expect.stringContaining('onboarding'),
      ]);
    });
  });

  describe('when a new folder is selected after an import', () => {
    it('drops the previous results', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');

      await selectFiles(
        container,
        [pickedFile('skills/onboarding/SKILL.md')],
        ['onboarding'],
      );

      expect(
        screen.queryByText('1 imported, 0 failed'),
      ).not.toBeInTheDocument();
    });

    it('lists the newly selected skills', async () => {
      const { container } = renderPanel();

      await selectFiles(container, [
        pickedFile('skills/documentation/SKILL.md'),
      ]);
      await userEvent.click(importButton());
      await screen.findByText('1 imported, 0 failed');

      await selectFiles(
        container,
        [pickedFile('skills/onboarding/SKILL.md')],
        ['onboarding'],
      );

      expect(
        screen.getAllByRole('listitem').map((item) => item.textContent),
      ).toEqual([expect.stringContaining('onboarding')]);
    });
  });
});
