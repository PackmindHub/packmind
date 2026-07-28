import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';

import { ImportRow } from '../hooks/useSequentialSkillImport';
import { SkillsUploadRow } from './SkillsUploadRow';

function renderRow(row: ImportRow) {
  return render(
    <UIProvider>
      <SkillsUploadRow row={row} />
    </UIProvider>,
  );
}

describe('SkillsUploadRow', () => {
  it('shows the skill name', () => {
    renderRow({ name: 'documentation', status: 'pending' });

    expect(screen.getByText('documentation')).toBeInTheDocument();
  });

  describe('when the skill is waiting its turn', () => {
    it('shows it as pending', () => {
      renderRow({ name: 'documentation', status: 'pending' });

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('when the skill is being uploaded', () => {
    it('announces the progress', () => {
      renderRow({ name: 'documentation', status: 'uploading' });

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('names the skill being imported for assistive technology', () => {
      renderRow({ name: 'documentation', status: 'uploading' });

      expect(screen.getByRole('status')).toHaveAccessibleName(
        'Importing documentation',
      );
    });
  });

  describe('when the skill was imported', () => {
    it('shows it as imported', () => {
      renderRow({ name: 'documentation', status: 'success' });

      expect(screen.getByText('Imported')).toBeInTheDocument();
    });

    it('does not announce progress any more', () => {
      renderRow({ name: 'documentation', status: 'success' });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('when the skill failed', () => {
    const failed: ImportRow = {
      name: 'onboarding',
      status: 'failed',
      error: 'A skill named "onboarding" already exists',
    };

    it('shows it as failed', () => {
      renderRow(failed);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('shows the reason it failed', () => {
      renderRow(failed);

      expect(
        screen.getByText('A skill named "onboarding" already exists'),
      ).toBeInTheDocument();
    });
  });

  describe('when the skill failed without a message', () => {
    it('still shows it as failed', () => {
      renderRow({ name: 'onboarding', status: 'failed' });

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });
});
