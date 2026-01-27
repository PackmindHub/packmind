import { ContentPreviewService } from './ContentPreviewService';
import { IGeneratedContent } from './ContentPreviewService';

describe('ContentPreviewService', () => {
  let service: ContentPreviewService;

  beforeEach(() => {
    service = new ContentPreviewService();
  });

  describe('formatPreview', () => {
    it('formats standards with rule counts', () => {
      const content: IGeneratedContent = {
        standards: [
          {
            name: 'TypeScript Standards',
            description: 'TS best practices',
            summary: 'Use TS properly',
            rules: [{ content: 'Use interfaces' }],
          },
        ],
        commands: [],
        skills: [],
        discoveredSkills: [],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('TypeScript Standards');
      expect(preview).toContain('1 rule');
    });

    it('formats commands with step counts', () => {
      const content: IGeneratedContent = {
        standards: [],
        commands: [
          {
            name: 'Create Module',
            summary: 'Create a new module',
            whenToUse: ['Adding features'],
            contextValidationCheckpoints: ['What name?'],
            steps: [
              { name: 'Step 1', description: 'Do something' },
              { name: 'Step 2', description: 'Do another thing' },
            ],
          },
        ],
        skills: [],
        discoveredSkills: [],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('Create Module');
      expect(preview).toContain('2 steps');
    });

    it('formats generated skills with descriptions', () => {
      const content: IGeneratedContent = {
        standards: [],
        commands: [],
        skills: [
          {
            name: 'debugging-skill',
            description: 'Debug applications',
            prompt: '# Debugging guide',
          },
        ],
        discoveredSkills: [],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('debugging-skill');
      expect(preview).toContain('Debug applications');
      expect(preview).toContain('SKILLS (generated)');
    });

    it('formats discovered skills with source paths', () => {
      const content: IGeneratedContent = {
        standards: [],
        commands: [],
        skills: [],
        discoveredSkills: [
          {
            name: 'custom-skill',
            description: 'A custom team skill',
            prompt: '# Custom content',
            sourcePath: '/project/.claude/skills/custom-skill/SKILL.md',
          },
        ],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('custom-skill');
      expect(preview).toContain('A custom team skill');
      expect(preview).toContain('SKILLS (discovered from project)');
      expect(preview).toContain('Source:');
    });

    it('shows summary totals', () => {
      const content: IGeneratedContent = {
        standards: [
          {
            name: 'Standard 1',
            description: 'Desc',
            summary: 'Summary',
            rules: [{ content: 'Rule' }],
          },
          {
            name: 'Standard 2',
            description: 'Desc',
            summary: 'Summary',
            rules: [{ content: 'Rule' }],
          },
        ],
        commands: [
          {
            name: 'Command 1',
            summary: 'Summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [{ name: 'Step', description: 'Desc' }],
          },
        ],
        skills: [
          {
            name: 'Skill 1',
            description: 'Desc',
            prompt: 'Prompt',
          },
        ],
        discoveredSkills: [],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('2 standards');
      expect(preview).toContain('1 command');
      expect(preview).toContain('1 skill');
    });

    it('counts both generated and discovered skills in total', () => {
      const content: IGeneratedContent = {
        standards: [],
        commands: [],
        skills: [
          {
            name: 'generated-skill',
            description: 'Generated',
            prompt: 'Prompt',
          },
        ],
        discoveredSkills: [
          {
            name: 'discovered-skill',
            description: 'Discovered',
            prompt: 'Prompt',
            sourcePath: '/path',
          },
          {
            name: 'another-discovered',
            description: 'Another',
            prompt: 'Prompt',
            sourcePath: '/path2',
          },
        ],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('3 skills');
      expect(preview).toContain('Total: 3 items');
    });

    it('returns empty message when no content generated', () => {
      const content: IGeneratedContent = {
        standards: [],
        commands: [],
        skills: [],
        discoveredSkills: [],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('No content generated');
    });
  });
});
