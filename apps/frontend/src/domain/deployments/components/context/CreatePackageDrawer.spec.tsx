import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { CreatePackageDrawer } from './CreatePackageDrawer';
import { useCreatePackageMutation } from '../../api/queries/DeploymentsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useCreatePackageMutation: vi.fn(),
}));

/**
 * The description field is a Milkdown editor, which brings a whole rich-text
 * runtime into a test about a keystroke on the field above it. Replaced by a
 * textarea, which is also what lets a test check that Enter typed in the
 * description is not read as "create".
 */
vi.mock('../../../../shared/components/editor/MarkdownEditor', () => ({
  MarkdownEditorProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  MarkdownEditor: ({
    onMarkdownChange,
  }: {
    onMarkdownChange?: (value: string) => void;
  }) => (
    <textarea
      aria-label="Description"
      onChange={(event) => onMarkdownChange?.(event.target.value)}
    />
  ),
}));

const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

const renderDrawer = ({
  mutateAsync = vi.fn().mockResolvedValue({
    package: { id: createPackageId('pkg-1') },
  }),
  isPending = false,
  onCreated = vi.fn(),
}: {
  mutateAsync?: Mock;
  isPending?: boolean;
  onCreated?: Mock;
} = {}) => {
  (useCreatePackageMutation as Mock).mockReturnValue({
    mutateAsync,
    isPending,
  });

  render(
    <UIProvider>
      <CreatePackageDrawer
        spaceId={spaceId}
        organizationId={organizationId}
        open
        onOpenChange={vi.fn()}
        onCreated={onCreated}
      />
    </UIProvider>,
  );

  return { mutateAsync, onCreated };
};

const nameField = () => screen.getByPlaceholderText('Enter package name');

describe('CreatePackageDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens on the name', () => {
    renderDrawer();

    expect(nameField()).toHaveFocus();
  });

  describe('when the name is confirmed with the keyboard', () => {
    it('creates the package', async () => {
      const { mutateAsync } = renderDrawer();

      await userEvent.type(nameField(), 'Frontend{Enter}');

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Frontend', spaceId }),
        ),
      );
    });

    it('opens what it created, as the button does', async () => {
      const { onCreated } = renderDrawer();

      await userEvent.type(nameField(), 'Frontend{Enter}');

      await waitFor(() =>
        expect(onCreated).toHaveBeenCalledWith(createPackageId('pkg-1')),
      );
    });
  });

  describe('when there is nothing to create yet', () => {
    it('does nothing on an empty name', async () => {
      const { mutateAsync } = renderDrawer();

      await userEvent.type(nameField(), '{Enter}');

      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('does nothing on a name of spaces', async () => {
      const { mutateAsync } = renderDrawer();

      await userEvent.type(nameField(), '   {Enter}');

      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('does not ask twice while the first request is in flight', async () => {
      const { mutateAsync } = renderDrawer({ isPending: true });

      await userEvent.type(nameField(), 'Frontend{Enter}');

      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('when the description is being written', () => {
    it('leaves Enter to the editor', async () => {
      const { mutateAsync } = renderDrawer();

      await userEvent.type(nameField(), 'Frontend');
      await userEvent.type(screen.getByLabelText('Description'), 'Why{Enter}');

      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('when the Create button is used instead', () => {
    it('creates the same package', async () => {
      const { mutateAsync } = renderDrawer();

      await userEvent.type(nameField(), 'Frontend');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Frontend' }),
        ),
      );
    });
  });
});
