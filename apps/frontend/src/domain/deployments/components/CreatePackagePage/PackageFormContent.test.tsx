import React from 'react';
import { render, screen, within } from '@testing-library/react';
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

import { PackageFormContent } from './CreatePackagePage';

const spaceId = createSpaceId('space-1');
const userId = createUserId('user-1');

const freeStandardId = createStandardId('std-free');
const takenStandardId = createStandardId('std-taken');
const takenCommandId = createCommandId('cmd-taken');
const takenSkillId = createSkillId('skill-taken');

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
  overrides: Partial<React.ComponentProps<typeof PackageFormContent>> = {},
) => {
  const props: React.ComponentProps<typeof PackageFormContent> = {
    recipes: [command(takenCommandId, 'Deploy service')],
    standards: [
      standard(freeStandardId, 'Free Standard'),
      standard(takenStandardId, 'Taken Standard'),
    ],
    skills: [skill(takenSkillId, 'Review skill')],
    ownerByArtefactId: {},
    selectedCommandIds: [],
    selectedStandardIds: [],
    selectedSkillIds: [],
    setSelectedCommandIds: vi.fn(),
    setSelectedStandardIds: vi.fn(),
    setSelectedSkillIds: vi.fn(),
    isPending: false,
    isLoadingSkills: false,
    organizationSlug: 'acme',
    spaceSlug: 'main',
    ...overrides,
  };

  return render(
    <UIProvider>
      <MemoryRouter>
        <PackageFormContent {...props} />
      </MemoryRouter>
    </UIProvider>,
  );
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

describe('PackageFormContent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when components belong to a package already', () => {
    beforeEach(() => {
      renderContent({
        ownerByArtefactId: {
          [takenStandardId]: 'frontend-rules',
          [takenCommandId]: 'frontend-rules',
          [takenSkillId]: 'frontend-rules',
        },
      });
    });

    it('refuses to select the standard', () => {
      expect(optionNamed('Taken Standard')).toHaveAttribute(
        'data-disabled',
        '',
      );
    });

    it('refuses to select the command', () => {
      expect(optionNamed('Deploy service')).toHaveAttribute(
        'data-disabled',
        '',
      );
    });

    it('refuses to select the skill', () => {
      expect(optionNamed('Review skill')).toHaveAttribute('data-disabled', '');
    });

    it('names the package holding them', () => {
      expect(
        within(optionNamed('Taken Standard')).getByText('In frontend-rules'),
      ).toBeInTheDocument();
    });

    it('leaves a free component selectable', () => {
      expect(optionNamed('Free Standard')).not.toHaveAttribute('data-disabled');
    });
  });
});
