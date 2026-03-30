import { IPackmindApi } from '../api/IPackmindApi';
import { Skill, SpaceId } from '@packmind/types';

export async function apiSkillFactory(
  packmindApi: IPackmindApi,
  overrides?: Partial<{ name: string; spaceId: SpaceId }>,
): Promise<Skill> {
  const spaceId = overrides?.spaceId ?? (await packmindApi.listSpaces())[0].id;
  const name = overrides?.name ?? 'Test Skill';

  const content = `---
name: ${name}
description: Test skill for e2e
---

# ${name}

Test skill prompt content.
`;

  const response = await packmindApi.uploadSkill({
    spaceId,
    files: [
      {
        path: 'SKILL.md',
        content,
        permissions: '644',
        isBase64: false,
      },
    ],
  });

  return response.skill;
}
