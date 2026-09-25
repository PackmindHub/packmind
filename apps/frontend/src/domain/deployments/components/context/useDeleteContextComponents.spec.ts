import { renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';
import {
  createCommandId,
  createOrganizationId,
  createSkillId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import { useDeleteCommandsBatchMutation } from '../../../commands/api/queries/CommandsQueries';
import { useDeleteSkillsBatchMutation } from '../../../skills/api/queries/SkillsQueries';
import { useDeleteStandardsBatchMutation } from '../../../standards/api/queries/StandardsQueries';
import type { MovableComponent } from './buildMoveTargets';
import { useDeleteContextComponents } from './useDeleteContextComponents';

vi.mock('../../../commands/api/queries/CommandsQueries', () => ({
  useDeleteCommandsBatchMutation: vi.fn(),
}));

vi.mock('../../../skills/api/queries/SkillsQueries', () => ({
  useDeleteSkillsBatchMutation: vi.fn(),
}));

vi.mock('../../../standards/api/queries/StandardsQueries', () => ({
  useDeleteStandardsBatchMutation: vi.fn(),
}));

const SPACE_ID = createSpaceId('space-1');
const ORGANIZATION_ID = createOrganizationId('org-1');

/*
 * Typed as what the hook is documented to take rather than as whole components:
 * it reads a type and an id, and hands back what it was given, so a fixture
 * carrying the four fields a row renders would be testing the caller instead.
 * The name rides along because the outcome is asserted by identity, and that is
 * the field a caller's toast reads off it.
 */
type PickedComponent = MovableComponent & { name: string };

const STANDARD: PickedComponent = {
  type: 'standard',
  key: createStandardId('standard-1'),
  name: 'Naming',
};

const COMMAND: PickedComponent = {
  type: 'command',
  key: createCommandId('command-1'),
  name: 'Release',
};

const SKILL: PickedComponent = {
  type: 'skill',
  key: createSkillId('skill-1'),
  name: 'Onboard',
};

type MutationStub = { mutateAsync: Mock; isPending: boolean };

function stub(overrides: Partial<MutationStub> = {}): MutationStub {
  return {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    ...overrides,
  };
}

function mountWith({
  standards = stub(),
  commands = stub(),
  skills = stub(),
}: Partial<Record<'standards' | 'commands' | 'skills', MutationStub>> = {}) {
  (useDeleteStandardsBatchMutation as Mock).mockReturnValue(standards);
  (useDeleteCommandsBatchMutation as Mock).mockReturnValue(commands);
  (useDeleteSkillsBatchMutation as Mock).mockReturnValue(skills);

  const { result } = renderHook(() =>
    useDeleteContextComponents({
      spaceId: SPACE_ID,
      organizationId: ORGANIZATION_ID,
    }),
  );

  return { result, standards, commands, skills };
}

describe('useDeleteContextComponents', () => {
  describe('when the selection mixes the three types', () => {
    it('sends each type its own ids', async () => {
      const { result, standards, commands, skills } = mountWith();

      await result.current.deleteComponents([STANDARD, COMMAND, SKILL]);

      expect(standards.mutateAsync).toHaveBeenCalledWith([STANDARD.key]);
      expect(commands.mutateAsync).toHaveBeenCalledWith({
        organizationId: ORGANIZATION_ID,
        spaceId: SPACE_ID,
        commandIds: [COMMAND.key],
      });
      expect(skills.mutateAsync).toHaveBeenCalledWith([SKILL.key]);
    });

    it('reports the whole selection as deleted', async () => {
      const { result } = mountWith();

      const outcome = await result.current.deleteComponents([
        STANDARD,
        COMMAND,
        SKILL,
      ]);

      expect(outcome).toEqual({
        deleted: [STANDARD, COMMAND, SKILL],
        failed: [],
      });
    });
  });

  describe('when a type is absent from the selection', () => {
    it('leaves its endpoint alone', async () => {
      const { result, commands, skills } = mountWith();

      await result.current.deleteComponents([STANDARD]);

      expect(commands.mutateAsync).not.toHaveBeenCalled();
      expect(skills.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('when one type fails', () => {
    it('reports only that type as failed', async () => {
      const { result } = mountWith({
        commands: stub({ mutateAsync: vi.fn().mockRejectedValue(new Error()) }),
      });

      const outcome = await result.current.deleteComponents([
        STANDARD,
        COMMAND,
        SKILL,
      ]);

      expect(outcome).toEqual({
        deleted: [STANDARD, SKILL],
        failed: [COMMAND],
      });
    });

    it('still deletes the types that can be deleted', async () => {
      const { result, standards, skills } = mountWith({
        commands: stub({ mutateAsync: vi.fn().mockRejectedValue(new Error()) }),
      });

      await result.current.deleteComponents([STANDARD, COMMAND, SKILL]);

      expect(standards.mutateAsync).toHaveBeenCalledWith([STANDARD.key]);
      expect(skills.mutateAsync).toHaveBeenCalledWith([SKILL.key]);
    });
  });

  describe('when one of the three endpoints is in flight', () => {
    it('reports the deletion as running', () => {
      const { result } = mountWith({ skills: stub({ isPending: true }) });

      expect(result.current.isDeleting).toBe(true);
    });
  });

  describe('when nothing is in flight', () => {
    it('reports the deletion as idle', () => {
      const { result } = mountWith();

      expect(result.current.isDeleting).toBe(false);
    });
  });
});
