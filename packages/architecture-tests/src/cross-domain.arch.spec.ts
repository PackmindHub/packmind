import { projectFiles } from 'archunit';
import { ARCH_TSCONFIG, DOMAIN_PACKAGES } from './architecture';

/**
 * Cross-domain isolation rules.
 *
 * Domains are autonomous hexagons. One domain must never import another domain's
 * source directly (`@packmind/<other>` resolves to that package's `src/index.ts`
 * barrel). Cross-domain collaboration goes exclusively through port interfaces
 * published in `@packmind/types`, wired at runtime via the HexaRegistry.
 *
 * This complements the Nx `env:*` tag boundaries (which only separate
 * node/shared/browser, not domain-from-domain).
 */
describe('Cross-domain isolation', () => {
  // One rule per source domain: its source must not depend on the source of ANY
  // other domain. The target is a single regex over the sibling package names.
  it.each(DOMAIN_PACKAGES.map((domain) => [domain] as const))(
    'forbids the %s domain from importing another domain directly',
    async (domain) => {
      const others = DOMAIN_PACKAGES.filter((d) => d !== domain);
      const otherDomainsSrc = new RegExp(`packages/(${others.join('|')})/src/`);

      const rule = projectFiles(ARCH_TSCONFIG)
        .inPath(`packages/${domain}/src/**`)
        .shouldNot()
        .dependOnFiles()
        .inPath(otherDomainsSrc);

      await expect(rule).toPassAsync();
    },
  );
});
