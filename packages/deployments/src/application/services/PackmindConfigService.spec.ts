import { PackmindConfigService } from './PackmindConfigService';

describe('PackmindConfigService', () => {
  let service: PackmindConfigService;

  beforeEach(() => {
    service = new PackmindConfigService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateConfigContent', () => {
    describe('with empty input', () => {
      it('returns empty packages object for empty input', () => {
        const result = service.generateConfigContent([]);

        expect(result).toEqual({ packages: {} });
      });
    });

    describe('with single package slug', () => {
      it('generates config with single package slug', () => {
        const result = service.generateConfigContent(['my-package']);

        expect(result).toEqual({
          packages: {
            'my-package': '*',
          },
        });
      });
    });

    describe('with multiple package slugs', () => {
      it('generates config with multiple package slugs', () => {
        const result = service.generateConfigContent([
          'package-a',
          'package-b',
          'package-c',
        ]);

        expect(result).toEqual({
          packages: {
            'package-a': '*',
            'package-b': '*',
            'package-c': '*',
          },
        });
      });
    });
  });

  describe('createConfigFileModification', () => {
    describe('with package slugs', () => {
      it('returns FileModification with correct path "packmind.json"', () => {
        const result = service.createConfigFileModification(['test-package']);

        expect(result.path).toBe('packmind.json');
      });

      it('returns FileModification with formatted JSON content', () => {
        const result = service.createConfigFileModification(['test-package']);

        const expectedContent =
          '{\n  "packages": {\n    "test-package": "*"\n  }\n}\n';

        expect(result.content).toBe(expectedContent);
      });
    });

    describe('with empty input', () => {
      it('returns FileModification with empty packages', () => {
        const result = service.createConfigFileModification([]);

        const expectedContent = '{\n  "packages": {}\n}\n';

        expect(result.content).toBe(expectedContent);
      });
    });
  });
});
