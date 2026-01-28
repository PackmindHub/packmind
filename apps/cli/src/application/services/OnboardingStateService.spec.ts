import { OnboardingStateService } from './OnboardingStateService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('OnboardingStateService', () => {
  let service: OnboardingStateService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'state-test-'));
    service = new OnboardingStateService(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('getState', () => {
    describe('when no state file exists', () => {
      it('returns default state with null last_run_at', async () => {
        const state = await service.getState('repo-fingerprint-123');

        expect(state.last_run_at).toBeNull();
      });

      it('returns default state with unsent push status', async () => {
        const state = await service.getState('repo-fingerprint-123');

        expect(state.last_push_status.status).toBe('unsent');
      });

      it('returns default state with zero baseline item count', async () => {
        const state = await service.getState('repo-fingerprint-123');

        expect(state.baseline_item_count).toBe(0);
      });
    });

    describe('when state file exists', () => {
      it('returns persisted last_run_at', async () => {
        const fingerprint = 'repo-fingerprint-123';
        await service.updateState(fingerprint, {
          last_run_at: '2026-01-28T10:00:00.000Z',
          baseline_item_count: 5,
        });

        const state = await service.getState(fingerprint);

        expect(state.last_run_at).toBe('2026-01-28T10:00:00.000Z');
      });

      it('returns persisted baseline_item_count', async () => {
        const fingerprint = 'repo-fingerprint-123';
        await service.updateState(fingerprint, {
          last_run_at: '2026-01-28T10:00:00.000Z',
          baseline_item_count: 5,
        });

        const state = await service.getState(fingerprint);

        expect(state.baseline_item_count).toBe(5);
      });
    });
  });

  describe('updateState', () => {
    it('persists last_run_at to disk', async () => {
      const fingerprint = 'repo-fingerprint-456';

      await service.updateState(fingerprint, {
        last_run_at: '2026-01-28T12:00:00.000Z',
        last_draft_paths: {
          json: '/path/to/draft.json',
          md: '/path/to/draft.md',
        },
        last_push_status: {
          status: 'sent',
          timestamp: '2026-01-28T12:05:00.000Z',
        },
        baseline_item_count: 7,
      });

      const state = await service.getState(fingerprint);

      expect(state.last_run_at).toBe('2026-01-28T12:00:00.000Z');
    });

    it('persists last_draft_paths to disk', async () => {
      const fingerprint = 'repo-fingerprint-456';

      await service.updateState(fingerprint, {
        last_run_at: '2026-01-28T12:00:00.000Z',
        last_draft_paths: {
          json: '/path/to/draft.json',
          md: '/path/to/draft.md',
        },
        last_push_status: {
          status: 'sent',
          timestamp: '2026-01-28T12:05:00.000Z',
        },
        baseline_item_count: 7,
      });

      const state = await service.getState(fingerprint);

      expect(state.last_draft_paths.json).toBe('/path/to/draft.json');
    });

    it('persists last_push_status to disk', async () => {
      const fingerprint = 'repo-fingerprint-456';

      await service.updateState(fingerprint, {
        last_run_at: '2026-01-28T12:00:00.000Z',
        last_draft_paths: {
          json: '/path/to/draft.json',
          md: '/path/to/draft.md',
        },
        last_push_status: {
          status: 'sent',
          timestamp: '2026-01-28T12:05:00.000Z',
        },
        baseline_item_count: 7,
      });

      const state = await service.getState(fingerprint);

      expect(state.last_push_status.status).toBe('sent');
    });

    it('merges partial updates with existing state', async () => {
      const fingerprint = 'repo-fingerprint-merge';

      await service.updateState(fingerprint, {
        last_run_at: '2026-01-28T10:00:00.000Z',
        baseline_item_count: 3,
      });

      await service.updateState(fingerprint, {
        baseline_item_count: 5,
      });

      const state = await service.getState(fingerprint);

      expect(state.last_run_at).toBe('2026-01-28T10:00:00.000Z');
      expect(state.baseline_item_count).toBe(5);
    });
  });

  describe('markAsSent', () => {
    it('updates push status to sent', async () => {
      const fingerprint = 'repo-fingerprint-789';

      await service.markAsSent(fingerprint);

      const state = await service.getState(fingerprint);
      expect(state.last_push_status.status).toBe('sent');
    });

    it('sets timestamp when marking as sent', async () => {
      const fingerprint = 'repo-fingerprint-789';

      await service.markAsSent(fingerprint);

      const state = await service.getState(fingerprint);
      expect(state.last_push_status.timestamp).toBeDefined();
    });
  });

  describe('getDefaultDraftDir', () => {
    it('returns path containing drafts directory', async () => {
      const draftDir = await service.getDefaultDraftDir();

      expect(draftDir).toContain('drafts');
    });

    it('creates drafts directory if it does not exist', async () => {
      const draftDir = await service.getDefaultDraftDir();

      const exists = await fs
        .access(draftDir)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });
  });
});
