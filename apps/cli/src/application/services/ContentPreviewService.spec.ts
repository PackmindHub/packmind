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
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('Create Module');
      expect(preview).toContain('2 steps');
    });

    it('formats skills with descriptions', () => {
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
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('debugging-skill');
      expect(preview).toContain('Debug applications');
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
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('2 standards');
      expect(preview).toContain('1 command');
      expect(preview).toContain('1 skill');
    });

    it('returns empty message when no content generated', () => {
      const content: IGeneratedContent = {
        standards: [],
        commands: [],
        skills: [],
      };

      const preview = service.formatPreview(content);

      expect(preview).toContain('No content generated');
    });
  });
});
