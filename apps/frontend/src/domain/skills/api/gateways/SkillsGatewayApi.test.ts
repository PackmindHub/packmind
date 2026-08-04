import {
  createOrganizationId,
  createSpaceId,
  UploadSkillFileInput,
} from '@packmind/types';

import { SkillsGatewayApi, UPLOAD_SKILL_TIMEOUT_MS } from './SkillsGatewayApi';

const mockApiPost = vi.fn();

vi.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: vi.fn().mockImplementation(function (
      this: { _endpoint: string; _api: { post: jest.Mock } },
      endpoint: string,
    ) {
      this._endpoint = endpoint;
      this._api = {
        post: mockApiPost,
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
});
