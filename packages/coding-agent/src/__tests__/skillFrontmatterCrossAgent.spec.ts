import { IStandardsPort } from '@packmind/types';
import { skillVersionFactory } from '@packmind/skills/test';
import { ClaudeDeployer } from '../infra/repositories/claude/ClaudeDeployer';
import { CopilotDeployer } from '../infra/repositories/copilot/CopilotDeployer';
import { CursorDeployer } from '../infra/repositories/cursor/CursorDeployer';

describe('Cross-agent SKILL.md frontmatter rendering', () => {
  let mockStandardsPort: jest.Mocked<IStandardsPort>;

  beforeEach(() => {
    mockStandardsPort = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;
  });

  describe('when a skill declares arguments, paths and context together', () => {
    const skillVersion = skillVersionFactory({
      additionalProperties: {
        arguments: 'file format',
        paths: ['src/**/*.ts'],
        context: 'fork',
      },
    });

    it('Claude Code renders all three keys', async () => {
      const deployer = new ClaudeDeployer(mockStandardsPort);
      const updates = await deployer.generateFileUpdatesForSkills([
        skillVersion,
      ]);
      const content = updates.createOrUpdate[0].content;

      expect(content).toContain("arguments: 'file format'");
      expect(content).toContain("paths: ['src/**/*.ts']");
      expect(content).toContain("context: 'fork'");
    });

    it('Cursor renders only paths', async () => {
      const deployer = new CursorDeployer(mockStandardsPort);
      const updates = await deployer.generateFileUpdatesForSkills([
        skillVersion,
      ]);
      const content = updates.createOrUpdate[0].content;

      expect(content).toContain("paths: ['src/**/*.ts']");
      expect(content).not.toContain('arguments:');
      expect(content).not.toContain('context:');
    });

    it('Copilot renders only context', async () => {
      const deployer = new CopilotDeployer(mockStandardsPort);
      const updates = await deployer.generateFileUpdatesForSkills([
        skillVersion,
      ]);
      const content = updates.createOrUpdate[0].content;

      expect(content).toContain("context: 'fork'");
      expect(content).not.toContain('arguments:');
      expect(content).not.toContain('paths:');
    });
  });
});
