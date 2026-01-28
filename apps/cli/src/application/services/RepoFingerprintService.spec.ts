import { RepoFingerprintService } from './RepoFingerprintService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('RepoFingerprintService', () => {
  let service: RepoFingerprintService;
  let tempDir: string;

  beforeEach(async () => {
    service = new RepoFingerprintService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fingerprint-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('generateFingerprint', () => {
    it('generates a stable fingerprint for the same path', async () => {
      const fingerprint1 = await service.generateFingerprint(tempDir);
      const fingerprint2 = await service.generateFingerprint(tempDir);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('generates different fingerprints for different paths', async () => {
      const tempDir2 = await fs.mkdtemp(
        path.join(os.tmpdir(), 'fingerprint-test-2-'),
      );

      const fingerprint1 = await service.generateFingerprint(tempDir);
      const fingerprint2 = await service.generateFingerprint(tempDir2);

      expect(fingerprint1).not.toBe(fingerprint2);

      await fs.rm(tempDir2, { recursive: true, force: true });
    });

    it('returns a hex string', async () => {
      const fingerprint = await service.generateFingerprint(tempDir);

      expect(fingerprint).toMatch(/^[a-f0-9]+$/);
    });
  });
});
