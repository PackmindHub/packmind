import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  createSkillId,
  createSkillVersionId,
  createUserId,
} from '@packmind/types';
import { SkillFileEditor } from './SkillFileEditor';
import { useUpdateSkillFileMutation } from '../api/queries/SkillsQueries';

const mockTrack = jest.fn();

jest.mock(
  '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider',
  () => ({
    useAnalytics: () => ({ track: mockTrack }),
  }),
);

jest.mock('../../../shared/components/editor/MarkdownEditorWithMode', () => ({
  MarkdownEditorWithMode: ({
    defaultValue,
    onEditorReady,
  }: {
    defaultValue: string;
    onEditorReady?: (api: { getMarkdown: () => string }) => void;
  }) => {
    const valueRef = React.useRef(defaultValue);
    React.useEffect(() => {
      onEditorReady?.({ getMarkdown: () => valueRef.current });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <textarea
        data-testid="markdown-editor"
        defaultValue={defaultValue}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          valueRef.current = e.target.value;
        }}
      />
    );
  },
}));

jest.mock('../api/queries/SkillsQueries', () => ({
  useUpdateSkillFileMutation: jest.fn(),
}));

const mockUseUpdateSkillFileMutation =
  useUpdateSkillFileMutation as jest.MockedFunction<
    typeof useUpdateSkillFileMutation
  >;

const createMockMutation = (overrides = {}) =>
  ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  }) as unknown as ReturnType<typeof useUpdateSkillFileMutation>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </UIProvider>,
  );
};

const typeContent = (value: string) => {
  const editor = screen.getByTestId('markdown-editor');
  fireEvent.change(editor, { target: { value } });
};

const clickSave = async () => {
  const button = screen.getByRole('button', { name: 'Save' });
  await act(async () => {
    fireEvent.click(button);
  });
};

describe('SkillFileEditor', () => {
  const skillId = createSkillId('skill-1');

  const defaultProps = {
    skillId,
    skillSlug: 'my-skill',
    filePath: 'references/guide.md',
    initialContent: 'Original content',
    currentVersion: 1,
    onCancel: jest.fn(),
    onSaved: jest.fn(),
  };

  beforeEach(() => {
    mockUseUpdateSkillFileMutation.mockReturnValue(createMockMutation());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with a real content change', () => {
    it('saves with the correct skillId, slug, filePath and content', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        skillVersion: null,
        versionCreated: false,
      });
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      renderWithProviders(<SkillFileEditor {...defaultProps} />);
      typeContent('Updated content');

      await clickSave();

      expect(mockMutateAsync).toHaveBeenCalledWith({
        skillId,
        slug: 'my-skill',
        filePath: 'references/guide.md',
        content: 'Updated content',
      });
    });

    it('does not track analytics when no new version is created', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        skillVersion: null,
        versionCreated: false,
      });
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      renderWithProviders(<SkillFileEditor {...defaultProps} />);
      typeContent('Updated content');

      await clickSave();

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('calls onSaved on success', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({
        skillVersion: null,
        versionCreated: false,
      });
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      const onSaved = jest.fn();
      renderWithProviders(
        <SkillFileEditor {...defaultProps} onSaved={onSaved} />,
      );
      typeContent('Updated content');

      await clickSave();

      expect(onSaved).toHaveBeenCalled();
    });
  });

  describe('when a new version is created', () => {
    it('tracks an artifact_updated analytics event', async () => {
      const skillVersion = {
        id: createSkillVersionId('version-2'),
        skillId,
        version: 2,
        userId: createUserId('user-1'),
        name: 'My skill',
        slug: 'my-skill',
        description: 'desc',
        prompt: 'Updated content',
      };
      const mockMutateAsync = jest.fn().mockResolvedValue({
        skillVersion,
        versionCreated: true,
      });
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      renderWithProviders(<SkillFileEditor {...defaultProps} />);
      typeContent('Updated content');

      await clickSave();

      expect(mockTrack).toHaveBeenCalledWith('artifact_updated', {
        artifactType: 'skill',
        id: skillId,
        from: 1,
        to: 2,
      });
    });
  });

  describe('when the mutation fails', () => {
    it('shows an inline error', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('boom'));
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      renderWithProviders(<SkillFileEditor {...defaultProps} />);
      typeContent('Updated content');

      await clickSave();

      expect(
        screen.getByText('Unable to save file. Please try again.'),
      ).toBeInTheDocument();
    });

    it('does not call onSaved', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('boom'));
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      const onSaved = jest.fn();
      renderWithProviders(
        <SkillFileEditor {...defaultProps} onSaved={onSaved} />,
      );
      typeContent('Updated content');

      await clickSave();

      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  describe('with emptied content', () => {
    it('shows an inline error on save', async () => {
      renderWithProviders(<SkillFileEditor {...defaultProps} />);
      typeContent('   ');

      await clickSave();

      expect(
        screen.getByText('File content cannot be empty.'),
      ).toBeInTheDocument();
    });

    it('does not call the mutation', async () => {
      const mockMutateAsync = jest.fn();
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      renderWithProviders(<SkillFileEditor {...defaultProps} />);
      typeContent('   ');

      await clickSave();

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('with content exceeding the maximum length', () => {
    it('shows an inline error on save', async () => {
      renderWithProviders(<SkillFileEditor {...defaultProps} />);
      typeContent('a'.repeat(300_001));

      await clickSave();

      expect(
        screen.getByText(
          'File content exceeds the maximum length of 300,000 characters.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('with unchanged content', () => {
    it('exits edit mode without calling the mutation on save', async () => {
      const mockMutateAsync = jest.fn();
      mockUseUpdateSkillFileMutation.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync }),
      );
      const onSaved = jest.fn();
      renderWithProviders(
        <SkillFileEditor {...defaultProps} onSaved={onSaved} />,
      );

      await clickSave();

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('calls onSaved on save', async () => {
      const onSaved = jest.fn();
      renderWithProviders(
        <SkillFileEditor {...defaultProps} onSaved={onSaved} />,
      );

      await clickSave();

      expect(onSaved).toHaveBeenCalled();
    });
  });

  describe('when clicking Cancel', () => {
    it('calls onCancel', async () => {
      const onCancel = jest.fn();
      renderWithProviders(
        <SkillFileEditor {...defaultProps} onCancel={onCancel} />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
