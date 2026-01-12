import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { UIProvider } from '@packmind/ui';
import {
  skillFactory,
  skillVersionFactory,
  skillFileFactory,
} from '@packmind/skills/test';
import { SkillDetails } from './SkillDetails';
import { buildSkillMarkdown } from '../utils/buildSkillMarkdown';

jest.mock('../utils/buildSkillMarkdown', () => ({
  buildSkillMarkdown: jest.fn(),
}));

jest.mock('./SkillDetailsSidebar', () => ({
  SkillDetailsSidebar: () => <div data-testid="skill-details-sidebar" />,
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

  describe('when SKILL.md file is selected', () => {
    it('reconstructs content from latestVersion', () => {
      const latestVersion = skillVersionFactory({
        name: 'Test Skill',
        description: 'Test description',
        prompt: 'Test prompt content',
      });

      const skillMdFile = skillFileFactory({
        path: 'SKILL.md',
        content: 'Original stored content',
      });

      const reconstructedContent = 'Reconstructed SKILL.md content';

      mockBuildSkillMarkdown.mockReturnValue(reconstructedContent);

      renderComponent({
        files: [skillMdFile],
        latestVersion,
      });

      expect(mockBuildSkillMarkdown).toHaveBeenCalledWith(latestVersion);
      expect(screen.getByTestId('file-content').textContent).toBe(
        reconstructedContent,
      );
    });

    it('calls buildSkillMarkdown when SKILL.md file has custom properties', () => {
      const latestVersion = skillVersionFactory();

      const skillMdFile = skillFileFactory({
        path: 'SKILL.md',
        content: 'Original content',
        permissions: 'custom-permissions',
      });

      mockBuildSkillMarkdown.mockReturnValue('Reconstructed content');

      renderComponent({
        files: [skillMdFile],
        latestVersion,
      });

      expect(mockBuildSkillMarkdown).toHaveBeenCalled();
    });
  });

  describe('when files array is empty', () => {
    it('returns null for selected file', () => {
      const latestVersion = skillVersionFactory();

      renderComponent({
        files: [],
        latestVersion,
      });

      expect(screen.getByTestId('no-file')).toBeInTheDocument();
    });
  });

  describe('when SKILL.md does not exist in files', () => {
    it('selects the first available file', () => {
      const latestVersion = skillVersionFactory();

      const otherFile = skillFileFactory({
        path: 'other-file.txt',
        content: 'Other file content',
      });

      mockBuildSkillMarkdown.mockReturnValue('Reconstructed');

      renderComponent({
        files: [otherFile],
        latestVersion,
      });

      // Since 'other-file.txt' is selected and is not SKILL.md,
      // buildSkillMarkdown should not be called
      expect(mockBuildSkillMarkdown).not.toHaveBeenCalled();
      expect(screen.getByTestId('file-content')).toHaveTextContent(
        'Other file content',
      );
    });
  });
});
