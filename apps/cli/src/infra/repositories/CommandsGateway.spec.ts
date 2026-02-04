import { CommandsGateway } from './CommandsGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { CaptureRecipeResponse, createSpaceId } from '@packmind/types';

// Shared helper for creating test API keys
const createTestApiKey = () => {
  const jwt = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      organization: { id: 'org-123', name: 'Test Org' },
      iat: Date.now(),
      exp: Date.now() + 3600000,
    }),
  ).toString('base64');
  const signature = 'test-signature';
  const fullJwt = `${jwt}.${payload}.${signature}`;

  return Buffer.from(
    JSON.stringify({
      host: 'http://localhost:4200',
      jwt: fullJwt,
    }),
  ).toString('base64');
};

describe('CommandsGateway', () => {
  let gateway: CommandsGateway;
  let mockSpacesGateway: jest.Mocked<ISpacesGateway>;

  const spaceId = createSpaceId('space-123');

  beforeEach(() => {
    mockSpacesGateway = {
      getGlobal: jest.fn(),
    };
  });

  describe('create', () => {
    let result: CaptureRecipeResponse;

    describe('when creating a command successfully', () => {
      beforeEach(async () => {
        global.fetch = jest.fn();
        const httpClient = new PackmindHttpClient(createTestApiKey());
        gateway = new CommandsGateway(httpClient);
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: 'cmd-123',
            name: 'Test Command',
            slug: 'test-command',
          }),
        });

        result = await gateway.create({
          spaceId,
          name: 'Test Command',
          summary: 'A test command for demonstration',
          whenToUse: ['When testing', 'When demonstrating'],
          contextValidationCheckpoints: ['Is the context clear?'],
          steps: [
            {
              name: 'Step 1',
              description: 'First step description',
              codeSnippet: 'const x = 1;',
            },
            { name: 'Step 2', description: 'Second step description' },
          ],
        });
      });

      it('returns the created command with id, name, and slug', () => {
        expect(result).toEqual({
          id: 'cmd-123',
          name: 'Test Command',
          slug: 'test-command',
        });
      });

      it('calls the correct API endpoint with POST', () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/spaces/${spaceId}/recipes`),
          expect.objectContaining({ method: 'POST' }),
        );
      });

      it('sends command data in the request body', () => {
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body).toEqual({
          spaceId,
          name: 'Test Command',
          summary: 'A test command for demonstration',
          whenToUse: ['When testing', 'When demonstrating'],
          contextValidationCheckpoints: ['Is the context clear?'],
          steps: [
            {
              name: 'Step 1',
              description: 'First step description',
              codeSnippet: 'const x = 1;',
            },
            { name: 'Step 2', description: 'Second step description' },
          ],
        });
      });
    });
  });

  describe('list', () => {
    describe('when listing commands successfully', () => {
      beforeEach(async () => {
        global.fetch = jest.fn();
        const httpClient = new PackmindHttpClient(createTestApiKey());
        gateway = new CommandsGateway(httpClient);

        mockSpacesGateway.getGlobal.mockResolvedValue({
          id: spaceId,
          slug: 'global',
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([
            { id: 'cmd-1', slug: 'command-one', name: 'Command One' },
            { id: 'cmd-2', slug: 'command-two', name: 'Command Two' },
          ]),
        });
      });

      it('returns list of commands', async () => {
        const result = await gateway.list({ spaceId });

        expect(result).toEqual({
          recipes: [
            { id: 'cmd-1', slug: 'command-one', name: 'Command One' },
            { id: 'cmd-2', slug: 'command-two', name: 'Command Two' },
          ],
        });
      });

      it('calls the correct API endpoint', async () => {
        await gateway.list({ spaceId });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/spaces/space-123/recipes'),
          expect.anything(),
        );
      });
    });
  });
});
