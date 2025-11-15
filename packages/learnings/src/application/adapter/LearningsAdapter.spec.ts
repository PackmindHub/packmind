import { PackmindLogger } from '@packmind/logger';
import { LearningsAdapter } from './LearningsAdapter';

describe('LearningsAdapter', () => {
  let adapter: LearningsAdapter;

  beforeEach(() => {
    adapter = new LearningsAdapter(new PackmindLogger('LearningsAdapter-Test'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('initializes successfully', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('isReady', () => {
    it('returns true after initialization', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });

    it('returns true even before initialization (Phase 1: no dependencies)', () => {
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('getPort', () => {
    it('returns the adapter instance as the port', () => {
      const port = adapter.getPort();
      expect(port).toBe(adapter);
    });
  });
});
