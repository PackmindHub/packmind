import { GitProvider, createGitProviderId } from '@packmind/types';
import {
  addGitConnectionHandler,
  AddGitConnectionHandlerDependencies,
} from './addGitConnectionHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { AddGitConnectionInput } from '../../../domain/repositories/IGitGateway';
import * as consoleLogger from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
}));

const mockLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

const input: AddGitConnectionInput = {
  source: 'gitlab',
  displayName: 'My GitLab',
  token: 'secret-token',
  url: 'https://gitlab.example.com',
};

function buildProvider(): GitProvider {
  return {
    id: createGitProviderId('provider-1'),
    source: 'gitlab',
    organizationId: 'org-1',
    url: 'https://gitlab.example.com',
    token: null,
    authMethod: 'token',
    displayName: 'My GitLab',
  } as GitProvider;
}

describe('addGitConnectionHandler', () => {
  let mockExit: jest.Mock;
  let mockAddGitConnection: jest.Mock;
  let deps: AddGitConnectionHandlerDependencies;

  beforeEach(() => {
    mockExit = jest.fn();
    mockAddGitConnection = jest.fn();
    deps = {
      packmindCliHexa: {
        addGitConnection: mockAddGitConnection,
      } as unknown as PackmindCliHexa,
      input,
      exit: mockExit,
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the connection is created', () => {
    beforeEach(() => {
      mockAddGitConnection.mockResolvedValue(buildProvider());
    });

    it('forwards the input to the facade', async () => {
      await addGitConnectionHandler(deps);

      expect(mockAddGitConnection).toHaveBeenCalledWith(input);
    });

    it('reports success with the created provider id', async () => {
      await addGitConnectionHandler(deps);

      expect(mockLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Git connection created: My GitLab (provider-1)',
      );
    });

    it('exits with code 0', async () => {
      await addGitConnectionHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when creation fails', () => {
    beforeEach(() => {
      mockAddGitConnection.mockRejectedValue(new Error('boom'));
    });

    it('exits with code 1', async () => {
      await addGitConnectionHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
