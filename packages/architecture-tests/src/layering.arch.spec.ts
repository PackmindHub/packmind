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

  describe('the application layer flows inward (use cases -> services), never back up', () => {
    it('forbids application services from importing use cases', async () => {
      // Use cases orchestrate services, never the reverse. A service reaching
      // back into a use case inverts the layer and usually signals logic that
      // belongs in the use case itself.
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.services)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.useCases);

      await expect(rule).toPassAsync();
    });

    it('forbids application services from importing the domain adapter', async () => {
      // The adapter sits at the top of the application layer (the port entry
      // point). Services are below it and must not depend back up on it.
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.services)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.adapters);

      await expect(rule).toPassAsync();
    });
  });

  describe('the API layer goes through ports, never straight to persistence', () => {
    it('forbids the API app from importing repository implementations', async () => {
      // Broader than controllers alone: no API file (controller, module,
      // NestJS service) may reach concrete persistence — only ports.
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.apiAll)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.repositories);

      await expect(rule).toPassAsync();
    });

    it('forbids the API app from importing the application layer', async () => {
      // The API reaches each domain only through its `@packmind/types` port,
      // injected by port-name via the HexaRegistry — never by importing use
      // cases, services or the adapter directly. Barrel-exported Hexa classes
      // and schemas live outside `application/`, so legitimate wiring is
      // unaffected.
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.apiAll)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.application);

      await expect(rule).toPassAsync();
    });
  });

  describe('schemas are pure ORM mapping', () => {
    it('forbids infra/schemas from importing the application layer', async () => {
      // EntitySchema files map entities to tables and nothing more. Unlike
      // infra/jobs (which legitimately wires application job implementations),
      // schemas must stay free of application concerns.
      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(LAYER_GLOBS.schemas)
        .shouldNot()
        .dependOnFiles()
        .inPath(LAYER_GLOBS.application);

      await expect(rule).toPassAsync();
    });
  });
});
