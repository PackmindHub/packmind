import {
  createOrganizationId,
  createSpaceId,
  UploadSkillFileInput,
} from '@packmind/types';

import { SkillsGatewayApi, UPLOAD_SKILL_TIMEOUT_MS } from './SkillsGatewayApi';
import { PackmindError } from '../../../../services/api/errors/PackmindError';
import type { Mock } from 'vitest';

const mockApiPost = vi.fn();
const mockApiGet = vi.fn();

vi.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: vi.fn().mockImplementation(function (
      this: { _endpoint: string; _api: { post: Mock; get: Mock } },
      endpoint: string,
    ) {
      this._endpoint = endpoint;
      this._api = {
        post: mockApiPost,
        get: mockApiGet,
      };
    }),
  };
});

describe('SkillsGatewayApi', () => {
  let gateway: SkillsGatewayApi;

  const organizationId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');
  const files: UploadSkillFileInput[] = [
    {
      path: 'SKILL.md',
      content: '---\nname: xlsx\n---',
      permissions: 'rw-r--r--',
      isBase64: false,
    },
  ];

  beforeEach(() => {
    mockApiPost.mockReset();
    mockApiPost.mockResolvedValue({});
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({});
    gateway = new SkillsGatewayApi();
  });

  describe('uploadSkill', () => {
    // The global ApiService timeout is far too short for a multi-megabyte body,
    // and the abort it triggers is indistinguishable from a network failure.
    it('overrides the default request timeout', async () => {
      await gateway.uploadSkill(organizationId, spaceId, files);

      expect(mockApiPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ timeout: UPLOAD_SKILL_TIMEOUT_MS }),
      );
    });

    it('allows more time than a plain JSON round-trip', () => {
      expect(UPLOAD_SKILL_TIMEOUT_MS).toBeGreaterThan(10_000);
    });
  });

  describe('getSkillBySlug', () => {
    describe('when the slug names no skill in this space', () => {
      beforeEach(() => {
        mockApiGet.mockRejectedValue(
          new PackmindError({
            data: { message: 'Skill with slug "commit" not found' },
            status: 404,
            statusText: 'Not Found',
          }),
        );
      });

      it('answers null', async () => {
        await expect(
          gateway.getSkillBySlug(organizationId, spaceId, 'commit'),
        ).resolves.toBeNull();
      });
    });

    describe('when the request fails for any other reason', () => {
      beforeEach(() => {
        mockApiGet.mockRejectedValue(
          new PackmindError({
            data: { message: 'Something broke' },
            status: 500,
            statusText: 'Internal Server Error',
          }),
        );
      });

      it('lets the failure through', async () => {
        await expect(
          gateway.getSkillBySlug(organizationId, spaceId, 'commit'),
        ).rejects.toBeInstanceOf(PackmindError);
      });
    });
  });
});
