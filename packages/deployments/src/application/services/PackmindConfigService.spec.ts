import { PackmindConfigService } from './PackmindConfigService';

describe('PackmindConfigService', () => {
  let service: PackmindConfigService;

  beforeEach(() => {
    service = new PackmindConfigService();
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

    describe('with existing packages', () => {
      it('merges new packages with existing packages', () => {
        const existingPackages = {
          'existing-a': '*',
          'existing-b': '*',
        };

        const result = service.generateConfigContent(
          ['new-package'],
          existingPackages,
        );

        expect(result).toEqual({
          packages: {
            'existing-a': '*',
            'existing-b': '*',
            'new-package': '*',
          },
        });
      });

      it('overwrites existing package version with new version', () => {
        const existingPackages = {
          'shared-package': '1.0.0',
        };

        const result = service.generateConfigContent(
          ['shared-package'],
          existingPackages,
        );

        expect(result).toEqual({
          packages: {
            'shared-package': '*',
          },
        });
      });

      describe('when adding new packages to existing ones', () => {
        it('preserves existing packages', () => {
          const existingPackages = {
            backend: '*',
            frontend: '*',
          };

          const result = service.generateConfigContent(
            ['api-standards'],
            existingPackages,
          );

          expect(result).toEqual({
            packages: {
              backend: '*',
              frontend: '*',
              'api-standards': '*',
            },
          });
        });
      });

      it('handles empty existing packages', () => {
        const result = service.generateConfigContent(['new-package'], {});

        expect(result).toEqual({
          packages: {
            'new-package': '*',
          },
        });
      });

      it('handles undefined existing packages', () => {
        const result = service.generateConfigContent(
          ['new-package'],
          undefined,
        );

        expect(result).toEqual({
          packages: {
            'new-package': '*',
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

    describe('with existing packages', () => {
      it('returns FileModification with merged packages content', () => {
        const existingPackages = {
          backend: '*',
          frontend: '*',
        };

        const result = service.createConfigFileModification(
          ['api-standards'],
          existingPackages,
        );

        const parsed = JSON.parse(result.content);
        expect(parsed.packages).toEqual({
          backend: '*',
          frontend: '*',
          'api-standards': '*',
        });
      });
    });
  });

  describe('removePackageFromConfig', () => {
    describe('with existing package to remove', () => {
      it('removes specified package from config', () => {
        const existingPackages = {
          'package-a': '*',
          'package-b': '*',
          'package-c': '*',
        };

        const result = service.removePackageFromConfig(
          'package-b',
          existingPackages,
        );

        expect(result).toEqual({
          packages: {
            'package-a': '*',
            'package-c': '*',
          },
        });
      });

      it('does not mutate original packages object', () => {
        const existingPackages = {
          'package-a': '*',
          'package-b': '*',
        };

        service.removePackageFromConfig('package-a', existingPackages);

        expect(existingPackages).toEqual({
          'package-a': '*',
          'package-b': '*',
        });
      });
    });

    describe('with non-existent package to remove', () => {
      describe('when slug does not exist', () => {
        it('returns unchanged config', () => {
          const existingPackages = {
            'package-a': '*',
            'package-b': '*',
          };

          const result = service.removePackageFromConfig(
            'non-existent-package',
            existingPackages,
          );

          expect(result).toEqual({
            packages: {
              'package-a': '*',
              'package-b': '*',
            },
          });
        });
      });
    });

    describe('with empty packages object', () => {
      describe('when removing from empty config', () => {
        it('returns empty packages', () => {
          const result = service.removePackageFromConfig('any-package', {});

          expect(result).toEqual({ packages: {} });
        });
      });
    });

    describe('with single package', () => {
      describe('when removing the only package', () => {
        it('returns empty packages', () => {
          const existingPackages = {
            'only-package': '*',
          };

          const result = service.removePackageFromConfig(
            'only-package',
            existingPackages,
          );

          expect(result).toEqual({ packages: {} });
        });
      });
    });
  });
});
