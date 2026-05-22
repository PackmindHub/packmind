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

  it('returns "claude" when cwd is the user\'s ~/.claude directory', () => {
    expect(isAgentHomeDirectory(path.join(mockHomedir, '.claude'))).toBe(
      'claude',
    );
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

  it('returns null when the directory only ends with ".claude"', () => {
    expect(
      isAgentHomeDirectory(path.join('/tmp', 'project', '.claude')),
    ).toBeNull();
  });

  it("returns null when cwd is the user's home directory itself", () => {
    expect(isAgentHomeDirectory(mockHomedir)).toBeNull();
  });

  it('returns null when no agent home directory matches', () => {
    expect(isAgentHomeDirectory(path.join(mockHomedir, '.cursor'))).toBeNull();
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
