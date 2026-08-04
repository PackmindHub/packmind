import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createOrganizationId,
  createSkillId,
  createSpaceId,
  createUserId,
  Skill,
  UploadSkillFileInput,
  UploadSkillResponse,
} from '@packmind/types';

import { skillsGateway } from '../gateways';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useUploadSkillMutation } from './SkillsQueries';
import type { MockedFunction } from 'vitest';

vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: vi.fn(),
}));

const mockUseAuthContext = useAuthContext as MockedFunction<
  typeof useAuthContext
>;
const mockUseCurrentSpace = useCurrentSpace as MockedFunction<
  typeof useCurrentSpace
>;

const organizationId = createOrganizationId('org-1');
const spaceId = createSpaceId('space-1');

function stubAuthContext(organization: { id: string } | undefined) {
  mockUseAuthContext.mockReturnValue({
    organization,
  } as unknown as ReturnType<typeof useAuthContext>);
}

function stubCurrentSpace(currentSpaceId: string | undefined) {
  mockUseCurrentSpace.mockReturnValue({
    spaceId: currentSpaceId,
  } as unknown as ReturnType<typeof useCurrentSpace>);
}

function buildWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const files: UploadSkillFileInput[] = [
  {
    path: 'my-skill/SKILL.md',
    content: '---\nname: My Skill\n---\n\nDo the thing.',
    permissions: '644',
    isBase64: false,
  },
];

const uploadResponse: UploadSkillResponse = {
  skill: {
    id: createSkillId('skill-1'),
    spaceId,
    userId: createUserId('user-1'),
    name: 'My Skill',
    slug: 'my-skill',
    version: 1,
    description: 'Do the thing.',
    prompt: 'Do the thing.',
    movedTo: null,
    createdAt: new Date('2026-07-28T00:00:00.000Z'),
    updatedAt: new Date('2026-07-28T00:00:00.000Z'),
  } as Skill,
  versionCreated: true,
};

describe('useUploadSkillMutation', () => {
  beforeEach(() => {
    stubAuthContext({ id: organizationId });
    stubCurrentSpace(spaceId);
  });

  afterEach(() => vi.clearAllMocks());

  it('uploads the files to the current organization and space', async () => {
    vi.spyOn(skillsGateway, 'uploadSkill').mockResolvedValue(uploadResponse);

    const { result } = renderHook(() => useUploadSkillMutation(), {
      wrapper: buildWrapper(),
    });
    await result.current.mutateAsync({ files, originSkill: undefined });

    expect(skillsGateway.uploadSkill).toHaveBeenCalledWith(
      organizationId,
      spaceId,
      files,
      undefined,
      { signal: undefined },
    );
  });

  describe('when an abort signal is provided', () => {
    it('forwards it to the gateway so the request can be cancelled', async () => {
      vi.spyOn(skillsGateway, 'uploadSkill').mockResolvedValue(uploadResponse);
      const { signal } = new AbortController();

      const { result } = renderHook(() => useUploadSkillMutation(), {
        wrapper: buildWrapper(),
      });
      await result.current.mutateAsync({ files, signal });

      expect(skillsGateway.uploadSkill).toHaveBeenCalledWith(
        organizationId,
        spaceId,
        files,
        undefined,
        { signal },
      );
    });
  });

  it('returns the uploaded skill', async () => {
    vi.spyOn(skillsGateway, 'uploadSkill').mockResolvedValue(uploadResponse);

    const { result } = renderHook(() => useUploadSkillMutation(), {
      wrapper: buildWrapper(),
    });

    await expect(
      result.current.mutateAsync({ files, originSkill: undefined }),
    ).resolves.toEqual(uploadResponse);
  });

  describe('when an originSkill is provided', () => {
    it('forwards it to the gateway', async () => {
      vi.spyOn(skillsGateway, 'uploadSkill').mockResolvedValue(uploadResponse);

      const { result } = renderHook(() => useUploadSkillMutation(), {
        wrapper: buildWrapper(),
      });
      await result.current.mutateAsync({ files, originSkill: 'skill-import' });

      expect(skillsGateway.uploadSkill).toHaveBeenCalledWith(
        organizationId,
        spaceId,
        files,
        'skill-import',
        { signal: undefined },
      );
    });
  });

  describe('when the upload is rejected', () => {
    it('surfaces the error', async () => {
      vi.spyOn(skillsGateway, 'uploadSkill').mockRejectedValue(
        new Error('Invalid frontmatter'),
      );

      const { result } = renderHook(() => useUploadSkillMutation(), {
        wrapper: buildWrapper(),
      });

      await expect(
        result.current.mutateAsync({ files, originSkill: undefined }),
      ).rejects.toThrow('Invalid frontmatter');
    });
  });

  describe('when there is no organization in context', () => {
    beforeEach(() => {
      stubAuthContext(undefined);
      vi.spyOn(skillsGateway, 'uploadSkill').mockResolvedValue(uploadResponse);
    });

    it('rejects the upload', async () => {
      const { result } = renderHook(() => useUploadSkillMutation(), {
        wrapper: buildWrapper(),
      });

      await expect(
        result.current.mutateAsync({ files, originSkill: undefined }),
      ).rejects.toThrow('Organization and space are required');
    });

    it('does not call the gateway', async () => {
      const { result } = renderHook(() => useUploadSkillMutation(), {
        wrapper: buildWrapper(),
      });
      await result.current
        .mutateAsync({ files, originSkill: undefined })
        .catch(() => undefined);

      expect(skillsGateway.uploadSkill).not.toHaveBeenCalled();
    });
  });

  describe('when there is no space in context', () => {
    beforeEach(() => {
      stubCurrentSpace(undefined);
      vi.spyOn(skillsGateway, 'uploadSkill').mockResolvedValue(uploadResponse);
    });

    it('rejects the upload', async () => {
      const { result } = renderHook(() => useUploadSkillMutation(), {
        wrapper: buildWrapper(),
      });

      await expect(
        result.current.mutateAsync({ files, originSkill: undefined }),
      ).rejects.toThrow('Organization and space are required');
    });

    it('does not call the gateway', async () => {
      const { result } = renderHook(() => useUploadSkillMutation(), {
        wrapper: buildWrapper(),
      });
      await result.current
        .mutateAsync({ files, originSkill: undefined })
        .catch(() => undefined);

      expect(skillsGateway.uploadSkill).not.toHaveBeenCalled();
    });
  });
});
