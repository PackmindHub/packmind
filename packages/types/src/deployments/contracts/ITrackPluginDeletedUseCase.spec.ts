import {
  ITrackPluginDeletedUseCase,
  TrackPluginDeletedCommand,
  TrackPluginDeletedResponse,
} from './ITrackPluginDeletedUseCase';

describe('ITrackPluginDeletedUseCase types', () => {
  it('Command exposes packageSlug and optional gitRemoteUrl', () => {
    const cmd: TrackPluginDeletedCommand = {
      userId: 'u',
      organizationId: 'o',
      packageSlug: 'security',
      gitRemoteUrl: 'https://github.com/acme/plugins.git',
    };
    expect(cmd.packageSlug).toBe('security');
    expect(cmd.gitRemoteUrl).toBeDefined();
  });

  it('Response exposes tracked flag', () => {
    const res: TrackPluginDeletedResponse = { tracked: true };
    expect(res.tracked).toBe(true);
  });

  it('UseCase interface combines Command and Response', () => {
    const useCase: ITrackPluginDeletedUseCase = {
      execute: async () => ({ tracked: true }),
    };
    expect(useCase.execute).toBeDefined();
  });
});
