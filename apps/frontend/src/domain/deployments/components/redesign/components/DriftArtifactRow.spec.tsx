import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createCommandId,
  createSkillId,
  createStandardId,
} from '@packmind/types';

import { DriftArtifactRow } from './DriftArtifactRow';
import type { DriftArtifactEntry } from '../selectors/installDriftEntries';
import type { ArtifactId, ArtifactKind, InstallDriftReason } from '../types';

const ID_OF: Record<ArtifactKind, ArtifactId> = {
  standard: createStandardId('standard-1'),
  command: createCommandId('command-1'),
  skill: createSkillId('skill-1'),
};

const entry = (
  kind: ArtifactKind,
  name: string,
  reason: InstallDriftReason = 'behind',
): DriftArtifactEntry => ({
  artifact: {
    id: ID_OF[kind],
    kind,
    name,
    packmindVersion: 2,
    isDeleted: false,
    isPending: false,
    installs: [],
  },
  reason,
  deployedVersion: 1,
  lastDeployedAt: '2026-08-01T10:00:00.000Z',
});

const renderRow = (row: DriftArtifactEntry) =>
  render(
    <UIProvider>
      <DriftArtifactRow entry={row} />
    </UIProvider>,
  );

describe('DriftArtifactRow', () => {
  /*
   * A package and a component of it can carry the same name, and the pane this
   * row is printed on had one of each called Typescript. The icon was the only
   * thing that said which was which, and an icon has to be learned first.
   */
  describe('what the row says a component is', () => {
    it('names a standard', () => {
      renderRow(entry('standard', 'Error handling'));

      expect(screen.getByText('Error handling')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('names a command', () => {
      renderRow(entry('command', 'cut-release'));

      expect(screen.getByText('Command')).toBeInTheDocument();
    });

    it('names a skill', () => {
      renderRow(entry('skill', 'Review a diff'));

      expect(screen.getByText('Skill')).toBeInTheDocument();
    });

    /* Not `standard`: the word is capitalised in the text, not by CSS. */
    it('says it the way a reader reads it', () => {
      renderRow(entry('standard', 'Error handling'));

      expect(screen.queryByText('standard')).not.toBeInTheDocument();
    });
  });

  describe('where the component stands', () => {
    it('shows the step it is behind by', () => {
      renderRow(entry('standard', 'Error handling'));

      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });

    it('says a deletion is still to be pushed', () => {
      renderRow(entry('skill', 'Retired skill', 'needs-removal'));

      expect(screen.getByText('Needs removal')).toBeInTheDocument();
    });

    it('says a new component has not landed yet', () => {
      renderRow(entry('command', 'new-command', 'not-distributed'));

      expect(screen.getByText('Not distributed')).toBeInTheDocument();
    });
  });
});
