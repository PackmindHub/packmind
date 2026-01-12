import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { UIProvider } from '@packmind/ui';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import { SkillDetails } from './SkillDetails';

jest.mock('./SkillDetailsSidebar', () => ({
  SkillDetailsSidebar: ({ files }: { files: { path: string }[] }) => (
    <div data-testid="skill-details-sidebar">
      {files.map((f) => (
        <span key={f.path} data-testid={`sidebar-file-${f.path}`}>
          {f.path}
        </span>
      ))}
    </div>
  ),
}));

jest.mock('./SkillVersionHistoryHeader', () => ({
  SkillVersionHistoryHeader: () => (
    <div data-testid="skill-version-history-header" />
  ),
}));

jest.mock('./SkillFilePreview', () => ({
  SkillFilePreview: ({ file }: { file: { content: string } | null }) => (
    <div data-testid="skill-file-preview">
      {file ? (
        <span data-testid="file-content">{file.content}</span>
      ) : (
        <span data-testid="no-file">No file</span>
      )}
    </div>
  ),
}));

const renderComponent = (props: Partial<Parameters<typeof SkillDetails>[0]>) =>
  render(
    <MemoryRouter initialEntries={['/org/test-org/spaces/test-space/skills']}>
      <UIProvider>
        <SkillDetails
          skill={skillFactory()}
          files={[]}
          latestVersion={skillVersionFactory()}
          skills={[]}
          skillsLoading={false}
          {...props}
        />
      </UIProvider>
    </MemoryRouter>,
  );

describe('SkillDetails', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when rendering', () => {
    it('creates virtual SKILL.md with prompt content', () => {
      const latestVersion = skillVersionFactory({
        name: 'Test Skill',
        description: 'Test description',
        prompt: 'Test prompt content',
      });

      renderComponent({ latestVersion });

      expect(screen.getByTestId('file-content').textContent).toBe(
        'Test prompt content',
      );
    });

    it('includes SKILL.md in sidebar file list', () => {
      renderComponent({});

      expect(screen.getByTestId('sidebar-file-SKILL.md')).toBeInTheDocument();
    });
  });

  describe('when files array is empty', () => {
    it('still shows SKILL.md with prompt content', () => {
      const latestVersion = skillVersionFactory({
        prompt: 'Prompt content here',
      });

      renderComponent({ files: [], latestVersion });

      expect(screen.getByTestId('file-content').textContent).toBe(
        'Prompt content here',
      );
    });

    it('shows SKILL.md as the only file in sidebar', () => {
      renderComponent({ files: [] });

      expect(screen.getByTestId('sidebar-file-SKILL.md')).toBeInTheDocument();
    });
  });
});
