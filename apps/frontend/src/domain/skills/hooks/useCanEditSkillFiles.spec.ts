import { renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';
import { createSkillId, createSpaceId, createUserId } from '@packmind/types';
import type { Skill } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../../spaces/api/queries/SpacesQueries';
import { useCanEditSkillFiles } from './useCanEditSkillFiles';

vi.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../../spaces/api/queries/SpacesQueries', () => ({
  useGetSpaceMembersQuery: vi.fn(),
}));

const SPACE_ID = createSpaceId('space-1');
const READER = createUserId('user-1');
const AUTHOR = createUserId('user-2');

const skill = (userId = AUTHOR) =>
  ({
    id: createSkillId('skill-1'),
    spaceId: SPACE_ID,
    userId,
  }) as Skill;

function signedInAs(
  orgRole: 'admin' | 'member',
  spaceRole?: 'admin' | 'member',
) {
  (useAuthContext as Mock).mockReturnValue({
    user: { id: READER },
    organization: { role: orgRole },
  });
  (useGetSpaceMembersQuery as Mock).mockReturnValue({
    data: spaceRole
      ? { members: [{ userId: READER, role: spaceRole }] }
      : undefined,
  });
}

describe('useCanEditSkillFiles', () => {
  describe('when the reader administers the space', () => {
    it('allows editing', () => {
      signedInAs('member', 'admin');

      const { result } = renderHook(() => useCanEditSkillFiles(skill()));

      expect(result.current).toBe(true);
    });
  });

  describe('when the reader administers the organization', () => {
    it('allows editing', () => {
      signedInAs('admin');

      const { result } = renderHook(() => useCanEditSkillFiles(skill()));

      expect(result.current).toBe(true);
    });
  });

  describe('when the reader wrote the skill', () => {
    it('allows editing', () => {
      signedInAs('member', 'member');

      const { result } = renderHook(() => useCanEditSkillFiles(skill(READER)));

      expect(result.current).toBe(true);
    });
  });

  describe('when the reader is none of the three', () => {
    it('refuses editing', () => {
      signedInAs('member', 'member');

      const { result } = renderHook(() => useCanEditSkillFiles(skill()));

      expect(result.current).toBe(false);
    });
  });

  /*
    A caller can ask before its own query has answered, and the honest answer
    then is no: a control that appears and then disappears is worse than one
    that appears once the answer is known.
  */
  describe('when the skill is not loaded yet', () => {
    it('refuses editing', () => {
      signedInAs('admin');

      const { result } = renderHook(() => useCanEditSkillFiles(undefined));

      expect(result.current).toBe(false);
    });
  });

  describe('when the membership list has not answered', () => {
    it('refuses editing on the strength of the space alone', () => {
      signedInAs('member');

      const { result } = renderHook(() => useCanEditSkillFiles(skill()));

      expect(result.current).toBe(false);
    });
  });
});
