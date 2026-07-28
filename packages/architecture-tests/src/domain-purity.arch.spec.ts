import { projectFiles } from 'archunit';
import { ARCH_TSCONFIG, LAYER_GLOBS } from './architecture';

/**
 * Domain purity rules.
 *
 * The `domain/` layer is the innermost ring: entities, repository interfaces
 * (ports) and pure domain logic. It must not know about the layers that depend
 * on it (`application/`) nor about infrastructure (`infra/`).
 *
 * Known caveat surfaced by the `infra` rule: in several packages the TypeORM
 * `@Entity` class IS the domain type and lives under `infra/schemas/`, so
 * `domain/repositories/*` interfaces import it from `infra`. That is real
 * architecture debt — the rule is intentionally left failing to document it (see
 * the package README "Known violations" section) rather than hidden.
 */
describe('Domain purity', () => {
  it('forbids the domain layer from importing the application layer', async () => {
    const rule = projectFiles(ARCH_TSCONFIG)
      .inPath(LAYER_GLOBS.domain)
      .shouldNot()
      .dependOnFiles()
      .inPath(LAYER_GLOBS.application);

    await expect(rule).toPassAsync();
  });

  it('forbids the domain layer from importing the infrastructure layer', async () => {
    const rule = projectFiles(ARCH_TSCONFIG)
      .inPath(LAYER_GLOBS.domain)
      .shouldNot()
      .dependOnFiles()
      .inPath(LAYER_GLOBS.infra);

    await expect(rule).toPassAsync();
  });
});
