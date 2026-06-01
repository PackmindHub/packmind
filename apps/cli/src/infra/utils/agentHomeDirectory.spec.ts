import * as os from 'os';
import * as path from 'path';
import {
  getAgentHomeDirPrefix,
  isAgentHomeDirectory,
} from './agentHomeDirectory';

jest.mock('os');

describe('isAgentHomeDirectory', () => {
  const mockHomedir = '/home/test-user';

  beforeEach(() => {
    (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
  });

  describe("when cwd is the user's ~/.claude directory", () => {
    it('returns "claude"', () => {
      expect(isAgentHomeDirectory(path.join(mockHomedir, '.claude'))).toBe(
        'claude',
      );
    });
  });

  it('normalises the cwd before comparing', () => {
    const denormalised = path.join(mockHomedir, '.claude', 'foo', '..');
    expect(isAgentHomeDirectory(denormalised)).toBe('claude');
  });

  it('returns null for a sub-directory of ~/.claude', () => {
    expect(
      isAgentHomeDirectory(path.join(mockHomedir, '.claude', 'skills')),
    ).toBeNull();
  });

  describe('when the directory only ends with ".claude"', () => {
    it('returns null', () => {
      expect(
        isAgentHomeDirectory(path.join('/tmp', 'project', '.claude')),
      ).toBeNull();
    });
  });

  describe("when cwd is the user's home directory itself", () => {
    it('returns null', () => {
      expect(isAgentHomeDirectory(mockHomedir)).toBeNull();
    });
  });

  describe('when no agent home directory matches', () => {
    it('returns null', () => {
      expect(
        isAgentHomeDirectory(path.join(mockHomedir, '.cursor')),
      ).toBeNull();
    });
  });
});

describe('getAgentHomeDirPrefix', () => {
  it('returns ".claude/" for the claude agent', () => {
    expect(getAgentHomeDirPrefix('claude')).toBe('.claude/');
  });

  it('returns null for agents without a registered home directory', () => {
    expect(getAgentHomeDirPrefix('cursor')).toBeNull();
  });
});
