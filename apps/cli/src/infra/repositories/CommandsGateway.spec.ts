import { CommandsGateway } from './CommandsGateway';
import { createMockHttpClient } from '../../mocks/createMockHttpClient';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { CaptureRecipeResponse, createSpaceId } from '@packmind/types';

describe('CommandsGateway', () => {
  let gateway: CommandsGateway;
  let mockHttpClient: jest.Mocked<PackmindHttpClient>;
  const mockOrganizationId = 'org-123';
  const spaceId = createSpaceId('space-123');

  beforeEach(() => {
    mockHttpClient = createMockHttpClient({
      getAuthContext: jest.fn().mockReturnValue({
        host: 'https://api.packmind.com',
        jwt: 'mock-jwt',
        organizationId: mockOrganizationId,
      }),
    });

    gateway = new CommandsGateway(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    let result: CaptureRecipeResponse;

    describe('when creating a command successfully', () => {
      const mockResponse = {
        id: 'cmd-123',
        name: 'Test Command',
        slug: 'test-command',
      };

      beforeEach(async () => {
        mockHttpClient.request.mockResolvedValue(mockResponse);

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
        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/spaces/${spaceId}/recipes`,
          expect.objectContaining({ method: 'POST' }),
        );
      });

      it('sends command data in the request body', () => {
        expect(mockHttpClient.request).toHaveBeenCalledWith(
          expect.any(String),
          {
            method: 'POST',
            body: {
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
            },
          },
        );
      });
    });
  });

  describe('list', () => {
    describe('when listing commands successfully', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue([
          { id: 'cmd-1', slug: 'command-one', name: 'Command One' },
          { id: 'cmd-2', slug: 'command-two', name: 'Command Two' },
        ]);
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

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/spaces/${spaceId}/recipes`,
        );
      });
    });
  });
});
