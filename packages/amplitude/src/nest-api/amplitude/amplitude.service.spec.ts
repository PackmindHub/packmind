import { Test, TestingModule } from '@nestjs/testing';
import { Configuration } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { AmplitudeService } from './amplitude.service';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

describe('AmplitudeService', () => {
  let service: AmplitudeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AmplitudeService,
          useFactory: () => new AmplitudeService(stubLogger()),
        },
      ],
    }).compile();

    service = module.get<AmplitudeService>(AmplitudeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('returns amplitude configuration with key and region', async () => {
      const mockKey = 'test-api-key';
      const mockRegion = 'EU';

      (Configuration.getConfig as jest.Mock)
        .mockResolvedValueOnce(mockKey)
        .mockResolvedValueOnce(mockRegion);

      const result = await service.getConfig();

      expect(result).toEqual({
        amplitudeKey: mockKey,
        amplitudeRegion: mockRegion,
      });
      expect(Configuration.getConfig).toHaveBeenCalledTimes(2);
    });

    describe('when environment variables are not set', () => {
      it('returns undefined values', async () => {
        (Configuration.getConfig as jest.Mock).mockResolvedValue(undefined);

        const result = await service.getConfig();

        expect(result).toEqual({
          amplitudeKey: undefined,
          amplitudeRegion: undefined,
        });
      });
    });
  });
});
