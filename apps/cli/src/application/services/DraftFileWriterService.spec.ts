import { DraftFileWriterService } from './DraftFileWriterService';
import { IOnboardingDraft } from '../../domain/types/OnboardingDraft';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('DraftFileWriterService', () => {
  let service: DraftFileWriterService;
  let tempDir: string;

  beforeEach(async () => {
    service = new DraftFileWriterService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draft-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  const createTestDraft = (): IOnboardingDraft => ({
    meta: {
      skill: 'packmind-onboard',
      version: '1.0',
      generated_at: '2026-01-28T10:00:00.000Z',
      repo_fingerprint: 'abc123',
      read_only: true,
    },
    summary: {
      languages: ['typescript'],
      frameworks: ['nestjs'],
      tools: ['eslint'],
      structure_hints: ['monorepo'],
    },
    baseline_items: [
      {
        id: 'item-1',
        type: 'tooling',
        label: 'Uses TypeScript',
        confidence: 'high',
        evidence: ['tsconfig.json'],
      },
    ],
    redactions: [],
    notes: [],
  });

  describe('writeDraftFiles', () => {
    describe('when format is "both"', () => {
      it('writes both JSON and Markdown files', async () => {
        const draft = createTestDraft();

        const result = await service.writeDraftFiles(draft, tempDir, 'both');

        expect(result.jsonPath).toContain('packmind-onboard.draft.json');
        expect(result.mdPath).toContain('packmind-onboard.draft.md');

        const jsonExists = await fs
          .access(result.jsonPath as string)
          .then(() => true)
          .catch(() => false);
        const mdExists = await fs
          .access(result.mdPath as string)
          .then(() => true)
          .catch(() => false);

        expect(jsonExists).toBe(true);
        expect(mdExists).toBe(true);
      });
    });

    describe('when format is "json"', () => {
      it('writes only JSON file', async () => {
        const draft = createTestDraft();

        const result = await service.writeDraftFiles(draft, tempDir, 'json');

        expect(result.jsonPath).toBeDefined();
        expect(result.mdPath).toBeNull();
      });
    });

    describe('when format is "md"', () => {
      it('writes only Markdown file', async () => {
        const draft = createTestDraft();

        const result = await service.writeDraftFiles(draft, tempDir, 'md');

        expect(result.jsonPath).toBeNull();
        expect(result.mdPath).toBeDefined();
      });
    });
  });

  describe('generateMarkdown', () => {
    it('includes disclaimer at the top', () => {
      const draft = createTestDraft();

      const markdown = service.generateMarkdown(draft);

      expect(markdown).toContain('GENERATED DRAFT');
      expect(markdown).toContain('editable');
      expect(markdown).toContain('delete');
    });

    it('includes baseline items with evidence', () => {
      const draft = createTestDraft();

      const markdown = service.generateMarkdown(draft);

      expect(markdown).toContain('Uses TypeScript');
      expect(markdown).toContain('tsconfig.json');
      expect(markdown).toContain('high');
    });

    it('includes what will be sent section', () => {
      const draft = createTestDraft();

      const markdown = service.generateMarkdown(draft);

      expect(markdown).toContain('What Will Be Sent');
    });
  });
});
