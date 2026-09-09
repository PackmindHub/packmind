import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import {
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
} from '@packmind/types';
import type { SkillFile } from '@packmind/types';
import { useGetSkillWithFilesByIdQuery } from '../../../skills/api/queries/SkillsQueries';
import { useCanEditSkillFiles } from '../../../skills/hooks/useCanEditSkillFiles';
import { ContextSkillFileDetail } from './ContextSkillFileDetail';

vi.mock('../../../skills/api/queries/SkillsQueries', () => ({
  useGetSkillWithFilesByIdQuery: vi.fn(),
}));

vi.mock('../../../skills/hooks/useCanEditSkillFiles', () => ({
  useCanEditSkillFiles: vi.fn(),
}));

const SKILL_ID = createSkillId('skill-1');

const FILE: SkillFile = {
  id: createSkillFileId('file-1'),
  skillVersionId: createSkillVersionId('version-1'),
  permissions: '',
  path: 'references/migrations.md',
  content: '# Migrations\n\nA migration runs twice or it is not ready.',
  isBase64: false,
};

async function renderFile(canEdit: boolean) {
  (useGetSkillWithFilesByIdQuery as Mock).mockReturnValue({
    data: {
      skill: { id: SKILL_ID, slug: 'release-checklist' },
      files: [FILE],
      latestVersion: { version: 3 },
    },
  });
  (useCanEditSkillFiles as Mock).mockReturnValue(canEdit);

  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter>
          <ContextSkillFileDetail
            file={FILE}
            skillId={SKILL_ID}
            skillName="Release checklist"
            backHref="?component=skill-1"
          />
        </MemoryRouter>
      </UIProvider>,
    );
  });
}

describe('ContextSkillFileDetail', () => {
  /*
    All of them, because the preview keeps a Preview and a Raw tab and both are
    in the DOM at once. The first is the rendered markdown.
  */
  it('reads the file', async () => {
    await renderFile(false);

    expect(screen.getAllByText(/a migration runs twice/i)[0]).toBeVisible();
  });

  it('offers the way back to the skill', async () => {
    await renderFile(false);

    expect(
      screen
        .getByRole('link', { name: /release checklist/i })
        .getAttribute('href'),
    ).toContain('component=skill-1');
  });

  /*
    The regression this file exists for. The pane was read-only while the
    skill's own page was still reachable and carried the pencil; increments 6
    and 7 closed that page, and read-only became "a skill cannot be edited".
  */
  describe('when the reader may edit the skill', () => {
    it('offers the pencil', async () => {
      await renderFile(true);

      expect(screen.getByRole('button', { name: /edit file/i })).toBeVisible();
    });
  });

  describe('when the reader may not', () => {
    it('does not offer it', async () => {
      await renderFile(false);

      expect(
        screen.queryByRole('button', { name: /edit file/i }),
      ).not.toBeInTheDocument();
    });
  });
});
