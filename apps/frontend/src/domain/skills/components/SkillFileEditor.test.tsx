import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  ChangeProposalStatus,
  createSkillId,
  createSkillVersionId,
  createUserId,
} from '@packmind/types';
import { SkillFileEditor } from './SkillFileEditor';
import { useUpdateSkillFileMutation } from '../api/queries/SkillsQueries';
import { useListChangeProposalsBySkillQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';

const mockTrack = jest.fn();
const mockToasterCreate = jest.fn();

jest.mock(
  '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider',
  () => ({
    useAnalytics: () => ({ track: mockTrack }),
  }),
);

jest.mock('@packmind/ui', () => ({
  ...jest.requireActual('@packmind/ui'),
  pmToaster: { create: (...args: unknown[]) => mockToasterCreate(...args) },
}));

jest.mock('../../../shared/components/editor/MarkdownEditor', () => ({
  MarkdownEditor: ({
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
  MarkdownEditorProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('../api/queries/SkillsQueries', () => ({
  useUpdateSkillFileMutation: jest.fn(),
}));

jest.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
    ),
    useListChangeProposalsBySkillQuery: jest.fn(),
  }),
);

const mockUseUpdateSkillFileMutation =
  useUpdateSkillFileMutation as jest.MockedFunction<
    typeof useUpdateSkillFileMutation
  >;

const mockUseListChangeProposalsBySkillQuery =
  useListChangeProposalsBySkillQuery as jest.MockedFunction<
    typeof useListChangeProposalsBySkillQuery
  >;

const mockPendingProposals = (pendingCount: number) => {
  mockUseListChangeProposalsBySkillQuery.mockReturnValue({
    data: {
      changeProposals: Array.from({ length: pendingCount }, () => ({
        status: ChangeProposalStatus.pending,
      })),
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useListChangeProposalsBySkillQuery>);
};

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
    // Mirror the OSS stub: no change-proposals data.
    mockUseListChangeProposalsBySkillQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useListChangeProposalsBySkillQuery>);
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

    it('shows a success toast', async () => {
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

      expect(mockToasterCreate).toHaveBeenCalledWith({
        type: 'success',
        title: 'File saved',
        description: 'Your changes have been saved.',
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

    it('does not show a toast', async () => {
      renderWithProviders(<SkillFileEditor {...defaultProps} />);

      await clickSave();

      expect(mockToasterCreate).not.toHaveBeenCalled();
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

  describe('with pending change proposals', () => {
    beforeEach(() => {
      mockPendingProposals(2);
    });

    it('shows the pending change proposals warning', () => {
      renderWithProviders(<SkillFileEditor {...defaultProps} />);

      expect(
        screen.getByText(
          '2 change proposals are pending on this skill. Saving a new version will make them outdated.',
        ),
      ).toBeInTheDocument();
    });

    describe('when saving a modified file', () => {
      it('asks for confirmation instead of saving directly', async () => {
        const mockMutateAsync = jest.fn();
        mockUseUpdateSkillFileMutation.mockReturnValue(
          createMockMutation({ mutateAsync: mockMutateAsync }),
        );
        renderWithProviders(<SkillFileEditor {...defaultProps} />);
        typeContent('Updated content');

        await clickSave();

        expect(
          await screen.findByText('Save with pending change proposals?'),
        ).toBeInTheDocument();
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });

      describe('when the user confirms', () => {
        it('saves the file', async () => {
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
          const confirmButton = await screen.findByRole('button', {
            name: 'Save anyway',
          });
          await act(async () => {
            fireEvent.click(confirmButton);
          });

          expect(mockMutateAsync).toHaveBeenCalledWith({
            skillId,
            slug: 'my-skill',
            filePath: 'references/guide.md',
            content: 'Updated content',
          });
        });
      });

      describe('when the user cancels', () => {
        it('does not save the file', async () => {
          const mockMutateAsync = jest.fn();
          mockUseUpdateSkillFileMutation.mockReturnValue(
            createMockMutation({ mutateAsync: mockMutateAsync }),
          );
          renderWithProviders(<SkillFileEditor {...defaultProps} />);
          typeContent('Updated content');

          await clickSave();
          const dialog = await screen.findByRole('dialog');
          await act(async () => {
            fireEvent.click(
              within(dialog).getByRole('button', { name: 'Cancel' }),
            );
          });

          expect(mockMutateAsync).not.toHaveBeenCalled();
        });
      });
    });

    describe('when saving an unchanged file', () => {
      it('exits silently without confirmation', async () => {
        const mockMutateAsync = jest.fn();
        mockUseUpdateSkillFileMutation.mockReturnValue(
          createMockMutation({ mutateAsync: mockMutateAsync }),
        );
        const onSaved = jest.fn();
        renderWithProviders(
          <SkillFileEditor {...defaultProps} onSaved={onSaved} />,
        );

        await clickSave();

        expect(
          screen.queryByText('Save with pending change proposals?'),
        ).not.toBeInTheDocument();
        expect(mockMutateAsync).not.toHaveBeenCalled();
        expect(onSaved).toHaveBeenCalled();
      });
    });
  });

  describe('without pending change proposals', () => {
    it('does not show the warning', () => {
      renderWithProviders(<SkillFileEditor {...defaultProps} />);

      expect(
        screen.queryByText(/pending on this skill/),
      ).not.toBeInTheDocument();
    });

    it('saves a modified file without confirmation', async () => {
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

      expect(
        screen.queryByText('Save with pending change proposals?'),
      ).not.toBeInTheDocument();
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});
