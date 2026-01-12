import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { UIProvider } from '@packmind/ui';
import { skillFactory, skillVersionFactory } from '@packmind/skills/test';
import { SkillDetails } from './SkillDetails';
import { buildSkillMarkdown } from '../utils/buildSkillMarkdown';

jest.mock('../utils/buildSkillMarkdown', () => ({
  buildSkillMarkdown: jest.fn(),
}));

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

const mockBuildSkillMarkdown = buildSkillMarkdown as jest.MockedFunction<
  typeof buildSkillMarkdown
>;

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
    it('creates virtual SKILL.md with reconstructed content', () => {
      const latestVersion = skillVersionFactory({
        name: 'Test Skill',
        description: 'Test description',
        prompt: 'Test prompt content',
      });

      const reconstructedContent = 'Reconstructed SKILL.md content';
      mockBuildSkillMarkdown.mockReturnValue(reconstructedContent);

      renderComponent({ latestVersion });

      expect(mockBuildSkillMarkdown).toHaveBeenCalledWith(latestVersion);
    });

    it('displays reconstructed SKILL.md content by default', () => {
      const reconstructedContent = 'Reconstructed SKILL.md content';
      mockBuildSkillMarkdown.mockReturnValue(reconstructedContent);

      renderComponent({});

      expect(screen.getByTestId('file-content').textContent).toBe(
        reconstructedContent,
      );
    });

    it('includes SKILL.md in sidebar file list', () => {
      mockBuildSkillMarkdown.mockReturnValue('content');

      renderComponent({});

      expect(screen.getByTestId('sidebar-file-SKILL.md')).toBeInTheDocument();
    });
  });

  describe('when files array is empty', () => {
    it('still shows SKILL.md with reconstructed content', () => {
      const reconstructedContent = 'Reconstructed content';
      mockBuildSkillMarkdown.mockReturnValue(reconstructedContent);

      renderComponent({ files: [] });

      expect(screen.getByTestId('file-content').textContent).toBe(
        reconstructedContent,
      );
    });

    it('shows SKILL.md as the only file in sidebar', () => {
      mockBuildSkillMarkdown.mockReturnValue('content');

      renderComponent({ files: [] });

      expect(screen.getByTestId('sidebar-file-SKILL.md')).toBeInTheDocument();
    });
  });
});
