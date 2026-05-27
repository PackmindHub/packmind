import { detectPluginMode } from './pluginsContext';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('detectPluginMode', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'pm-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('when only marketplace.json exists', () => {
    it('returns marketplace mode with the manifest path', () => {
      mkdirSync(join(tmp, '.claude-plugin'));
      writeFileSync(
        join(tmp, '.claude-plugin/marketplace.json'),
        '{"plugins":[]}',
      );

      expect(detectPluginMode(tmp)).toEqual({
        mode: 'marketplace',
        manifestPath: join(tmp, '.claude-plugin/marketplace.json'),
      });
    });
  });

  describe('when only plugin.json exists', () => {
    it('returns standalone mode', () => {
      mkdirSync(join(tmp, '.claude-plugin'));
      writeFileSync(
        join(tmp, '.claude-plugin/plugin.json'),
        '{"name":"security"}',
      );

      expect(detectPluginMode(tmp).mode).toBe('standalone');
    });
  });

  describe('when both manifests exist', () => {
    it('returns marketplace mode', () => {
      mkdirSync(join(tmp, '.claude-plugin'));
      writeFileSync(
        join(tmp, '.claude-plugin/marketplace.json'),
        '{"plugins":[]}',
      );
      writeFileSync(
        join(tmp, '.claude-plugin/plugin.json'),
        '{"name":"security"}',
      );

      expect(detectPluginMode(tmp).mode).toBe('marketplace');
    });
  });

  describe('when neither manifest exists', () => {
    it('returns none mode', () => {
      expect(detectPluginMode(tmp).mode).toBe('none');
    });
  });
});
