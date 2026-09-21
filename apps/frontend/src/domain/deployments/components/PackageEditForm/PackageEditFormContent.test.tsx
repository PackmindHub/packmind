import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  Command,
  CommandId,
  Skill,
  SkillId,
  Standard,
  StandardId,
  createCommandId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
} from '@packmind/types';

import { PackageEditFormContent } from './PackageEditFormContent';

const spaceId = createSpaceId('space-1');
const userId = createUserId('user-1');

const freeStandardId = createStandardId('std-free');
const takenStandardId = createStandardId('std-taken');
const ownStandardId = createStandardId('std-own');
const commandId = createCommandId('cmd-1');
const skillId = createSkillId('skill-1');

const standard = (id: StandardId, name: string): Standard => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s/g, '-'),
  description: '',
  version: 1,
  userId,
  scope: null,
  spaceId,
  movedTo: null,
});

const command = (id: CommandId, name: string): Command => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s/g, '-'),
  content: '',
  version: 1,
  userId,
  spaceId,
  movedTo: null,
});

const skill = (id: SkillId, name: string): Skill => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s/g, '-'),
  description: '',
  spaceId,
  createdBy: { userId, displayName: 'Tester' },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  prompt: '',
  userId,
  movedTo: null,
});

const renderContent = (
  overrides: Partial<React.ComponentProps<typeof PackageEditFormContent>> = {},
) => {
  const props: React.ComponentProps<typeof PackageEditFormContent> = {
    allCommands: [command(commandId, 'Deploy service')],
    allStandards: [
      standard(freeStandardId, 'Free Standard'),
      standard(takenStandardId, 'Taken Standard'),
      standard(ownStandardId, 'Own Standard'),
    ],
    allSkills: [skill(skillId, 'Review skill')],
    ownerByArtefactId: {},
    selectedCommandIds: [],
    selectedStandardIds: [],
    selectedSkillIds: [],
    setSelectedCommandIds: vi.fn(),
    setSelectedStandardIds: vi.fn(),
    setSelectedSkillIds: vi.fn(),
    isPending: false,
    isLoadingCommands: false,
    isLoadingStandards: false,
    isLoadingSkills: false,
    orgSlug: 'acme',
    spaceSlug: 'main',
    ...overrides,
  };

  return {
    ...render(
      <UIProvider>
        <MemoryRouter>
          <PackageEditFormContent {...props} />
        </MemoryRouter>
      </UIProvider>,
    ),
    props,
  };
};

/**
 * The dropdown rows. Every option is in the DOM from the start and the closed
 * listbox only hides them, so `hidden` is what reaches them without driving
 * the combobox open — which floating-ui cannot do under jsdom.
 */
const optionNamed = (name: string): HTMLElement => {
  const option = screen
    .getAllByRole('option', { hidden: true })
    .find((candidate) => within(candidate).queryByText(name) !== null);

  if (!option) throw new Error(`No option named "${name}"`);
  return option;
};

describe('PackageEditFormContent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when a standard belongs to another package', () => {
    beforeEach(() => {
      renderContent({
        ownerByArtefactId: { [takenStandardId]: 'frontend-rules' },
      });
    });

    it('refuses to select it', () => {
      expect(optionNamed('Taken Standard')).toHaveAttribute(
        'data-disabled',
        '',
      );
    });

    it('names the package holding it', () => {
      expect(
        within(optionNamed('Taken Standard')).getByText('In frontend-rules'),
      ).toBeInTheDocument();
    });

    it('leaves the other standards selectable', () => {
      expect(optionNamed('Free Standard')).not.toHaveAttribute('data-disabled');
    });
  });

  describe('when a standard this package holds also sits in another one', () => {
    beforeEach(() => {
      renderContent({
        selectedStandardIds: [ownStandardId],
        ownerByArtefactId: { [ownStandardId]: 'frontend-rules' },
      });
    });

    it('keeps it selectable so it can be taken out', () => {
      expect(optionNamed('Own Standard')).not.toHaveAttribute('data-disabled');
    });
  });

  describe('removing a selected standard', () => {
    it('drops it from the selection', () => {
      const { props } = renderContent({
        selectedStandardIds: [ownStandardId, freeStandardId],
        ownerByArtefactId: { [ownStandardId]: 'frontend-rules' },
      });

      fireEvent.click(screen.getAllByLabelText('Close')[0]);

      expect(props.setSelectedStandardIds).toHaveBeenCalledWith([
        ownStandardId,
      ]);
    });
  });
});
