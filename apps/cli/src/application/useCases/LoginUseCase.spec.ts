jest.mock('open', () => jest.fn());

import { LoginUseCase, ILoginDependencies } from './LoginUseCase';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockOpenBrowser: jest.Mock;
  let mockPromptForCode: jest.Mock;
  let mockExchangeCodeForApiKey: jest.Mock;
  let mockSaveCredentials: jest.Mock;
  let mockGetCredentialsPath: jest.Mock;
  let mockStartCallbackServer: jest.Mock;

  function createUseCase(
    overrides?: Partial<ILoginDependencies>,
  ): LoginUseCase {
    mockOpenBrowser = jest.fn().mockResolvedValue(undefined);
    mockPromptForCode = jest.fn().mockResolvedValue('mock-code');
    mockExchangeCodeForApiKey = jest.fn().mockResolvedValue({
      apiKey: 'mock-api-key',
      expiresAt: '2025-12-31T00:00:00Z',
    });
    mockSaveCredentials = jest.fn();
    mockGetCredentialsPath = jest.fn().mockReturnValue('/path/to/credentials');
    mockStartCallbackServer = jest.fn().mockResolvedValue('callback-code');

    return new LoginUseCase({
      openBrowser: mockOpenBrowser,
      promptForCode: mockPromptForCode,
      exchangeCodeForApiKey: mockExchangeCodeForApiKey,
      saveCredentials: mockSaveCredentials,
      getCredentialsPath: mockGetCredentialsPath,
      startCallbackServer: mockStartCallbackServer,
      ...overrides,
    });
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when host has trailing slash', () => {
    beforeEach(() => {
      useCase = createUseCase();
    });

    it('constructs login URL without double slashes', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai/',
      });

      expect(mockOpenBrowser).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/app\.packmind\.ai\/cli-login\?/),
      );
    });

    it('does not produce //cli-login in the URL', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai/',
      });

      expect(mockOpenBrowser).toHaveBeenCalledWith(
        expect.not.stringContaining('//cli-login'),
      );
    });
  });

  describe('when host has no trailing slash', () => {
    beforeEach(() => {
      useCase = createUseCase();
    });

    it('constructs login URL correctly', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
      });

      expect(mockOpenBrowser).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/app\.packmind\.ai\/cli-login\?/),
      );
    });

    it('does not produce //cli-login in the URL', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
      });

      expect(mockOpenBrowser).toHaveBeenCalledWith(
        expect.not.stringContaining('//cli-login'),
      );
    });
  });

  describe('when exchanging code for API key', () => {
    describe('with host having trailing slash', () => {
      it('passes normalized host to exchange function', async () => {
        useCase = createUseCase();

        await useCase.execute({
          host: 'https://app.packmind.ai/',
          code: 'provided-code',
        });

        expect(mockExchangeCodeForApiKey).toHaveBeenCalledWith(
          'provided-code',
          'https://app.packmind.ai/',
        );
      });
    });

    describe('with host having no trailing slash', () => {
      it('passes host as-is to exchange function', async () => {
        useCase = createUseCase();

        await useCase.execute({
          host: 'https://app.packmind.ai',
          code: 'provided-code',
        });

        expect(mockExchangeCodeForApiKey).toHaveBeenCalledWith(
          'provided-code',
          'https://app.packmind.ai',
        );
      });
    });
  });

  describe('when code is provided', () => {
    beforeEach(() => {
      useCase = createUseCase();
    });

    it('skips browser opening', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
        code: 'provided-code',
      });

      expect(mockOpenBrowser).not.toHaveBeenCalled();
    });

    it('skips callback server', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
        code: 'provided-code',
      });

      expect(mockStartCallbackServer).not.toHaveBeenCalled();
    });

    it('exchanges the provided code', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
        code: 'provided-code',
      });

      expect(mockExchangeCodeForApiKey).toHaveBeenCalledWith(
        'provided-code',
        'https://app.packmind.ai',
      );
    });
  });

  describe('when callback server returns code', () => {
    beforeEach(() => {
      useCase = createUseCase();
    });

    it('uses callback code for exchange', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
      });

      expect(mockExchangeCodeForApiKey).toHaveBeenCalledWith(
        'callback-code',
        'https://app.packmind.ai',
      );
    });
  });

  describe('when callback server fails', () => {
    beforeEach(() => {
      useCase = createUseCase({
        startCallbackServer: jest
          .fn()
          .mockRejectedValue(new Error('Port in use')),
        promptForCode: jest.fn().mockResolvedValue('manual-code'),
      });
    });

    it('falls back to manual code entry', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
      });

      expect(mockExchangeCodeForApiKey).toHaveBeenCalledWith(
        'manual-code',
        'https://app.packmind.ai',
      );
    });
  });

  describe('when login succeeds', () => {
    beforeEach(() => {
      useCase = createUseCase();
    });

    it('saves credentials', async () => {
      await useCase.execute({
        host: 'https://app.packmind.ai',
        code: 'test-code',
      });

      expect(mockSaveCredentials).toHaveBeenCalledWith('mock-api-key');
    });

    it('returns success result', async () => {
      const result = await useCase.execute({
        host: 'https://app.packmind.ai',
        code: 'test-code',
      });

      expect(result.success).toBe(true);
    });

    it('returns credentials path', async () => {
      const result = await useCase.execute({
        host: 'https://app.packmind.ai',
        code: 'test-code',
      });

      expect(result.credentialsPath).toBe('/path/to/credentials');
    });
  });

  describe('when no code is received', () => {
    beforeEach(() => {
      useCase = createUseCase({
        startCallbackServer: jest.fn().mockRejectedValue(new Error('Timeout')),
        promptForCode: jest.fn().mockResolvedValue(''),
      });
    });

    it('throws error', async () => {
      await expect(
        useCase.execute({
          host: 'https://app.packmind.ai',
        }),
      ).rejects.toThrow('No code received. Login cancelled.');
    });
  });
});
