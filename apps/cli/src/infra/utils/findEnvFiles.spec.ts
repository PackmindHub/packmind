import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findEnvFiles } from './findEnvFiles';

describe('findEnvFiles', () => {
  let rootDir: string;
  let subDir: string;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-env-files-'));
    subDir = path.join(rootDir, 'apps', 'frontend');
    fs.mkdirSync(subDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  describe('when .env files exist in the sub folder and at the root', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(subDir, '.env'), 'FOO=1');
      fs.writeFileSync(path.join(rootDir, '.env'), 'PACKMIND_API_KEY_V3=key');
    });

    it('returns all of them, nearest first', () => {
      expect(findEnvFiles(subDir, rootDir)).toEqual([
        path.join(subDir, '.env'),
        path.join(rootDir, '.env'),
      ]);
    });
  });

  describe('when only the root has a .env file', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(rootDir, '.env'), 'PACKMIND_API_KEY_V3=key');
    });

    it('returns the root .env file', () => {
      expect(findEnvFiles(subDir, rootDir)).toEqual([
        path.join(rootDir, '.env'),
      ]);
    });
  });

  describe('when a .env file exists above the stop directory', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(rootDir, '.env'), 'OUTSIDE=1');
    });

    it('does not return it', () => {
      expect(findEnvFiles(subDir, path.join(rootDir, 'apps'))).toEqual([]);
    });
  });

  describe('when there is no .env file', () => {
    it('returns an empty list', () => {
      expect(findEnvFiles(subDir, rootDir)).toEqual([]);
    });
  });
});
