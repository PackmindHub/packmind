import { projectFiles } from 'archunit';
import {
  ARCH_TSCONFIG,
  DOMAIN_SRC_REGEX,
  LAYER_GLOBS,
  SHARED_BASE_REGEX,
} from './architecture';

/**
 * Shared-package purity and reverse-dependency rules.
 *
 * The dependency graph is layered between packages too, not just within a
 * domain:
 *
 *   apps/api  ->  domain packages  ->  @packmind/types (+ node-utils, logger)
 *
 * Arrows only ever point that way. The contract and base packages are the
 * leaves everything builds on; they must never depend back on a domain (that
 * would be a cycle and would break "ports live in @packmind/types, not in the
 * domains"). And no domain may depend on the API app that consumes it.
 */
describe('Shared-package purity and reverse dependencies', () => {
  it('forbids the contract package (@packmind/types) from importing any domain', async () => {
    const rule = projectFiles(ARCH_TSCONFIG)
      .inPath(LAYER_GLOBS.types)
      .shouldNot()
      .dependOnFiles()
      .inPath(DOMAIN_SRC_REGEX);

    await expect(rule).toPassAsync();
  });

  it('forbids the base packages (node-utils, logger) from importing any domain', async () => {
    const rule = projectFiles(ARCH_TSCONFIG)
      .inPath(SHARED_BASE_REGEX)
      .shouldNot()
      .dependOnFiles()
      .inPath(DOMAIN_SRC_REGEX);

    await expect(rule).toPassAsync();
  });

  it('forbids any domain from importing the API app', async () => {
    const rule = projectFiles(ARCH_TSCONFIG)
      .inPath(DOMAIN_SRC_REGEX)
      .shouldNot()
      .dependOnFiles()
      .inPath(LAYER_GLOBS.apiAll);

    await expect(rule).toPassAsync();
  });
});
