import { projectFiles } from 'archunit';
import { ARCH_TSCONFIG, LAYER_GLOBS } from './architecture';

/**
 * Core workflow layering rules.
 *
 * Encodes the request flow documented in the hexagonal standards:
 *   NestJS controller -> NestJS service -> domain Adapter -> UseCase
 *     -> application Service -> repository interface -> repository implementation (infra)
 *
 * The dependency arrows only ever point "downward/inward". These rules assert
 * the forbidden shortcuts and back-edges. A failure is a genuine architecture
 * violation (the offending import is printed with a clickable path), not a flaky
 * test — see the package README for the standards each rule guards.
 */
describe('Core workflow layering', () => {
  describe('repository implementations do not depend upward on the application layer', () => {
    it('forbids infra/repositories from importing the application layer', async () => {
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.repositories)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.application);

      await expect(rule).toPassAsync();
    });
  });

  describe('the application layer reaches data only through repository interfaces', () => {
    it('forbids use cases from importing repository implementations', async () => {
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.useCases)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.repositories);

      await expect(rule).toPassAsync();
    });

    it('forbids domain adapters from importing repository implementations', async () => {
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.adapters)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.repositories);

      await expect(rule).toPassAsync();
    });

    it('forbids application services from importing repository implementations', async () => {
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.services)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.repositories);

      await expect(rule).toPassAsync();
    });
  });

  describe('the API layer goes through ports, never straight to persistence', () => {
    it('forbids NestJS controllers from importing repository implementations', async () => {
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.controllers)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.repositories);

      await expect(rule).toPassAsync();
    });
  });
});
