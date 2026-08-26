# Engineer Review — #436 Frontend Vitest suite re-imports the full module graph per spec

**Issue**: #436 | **Branch**: `agent/issue-436` | **Base**: `main` | **Files changed**: 1
**Layers touched**: Frontend — build/test tooling (`apps/frontend/vite.config.ts`)

This is the **human-judgment** pass, complementary to the qa/technical pass in
`issue-436-em-spec-report.md` (which already covered partition completeness, Vitest-4 API validity,
standards globbing, and the missing existence-guard on `LEAKY_SPECS`). I do not re-flag those; the
notes below are the concerns that pass didn't reach — chiefly edition/multi-tenancy scope and the
maintainer's stated acceptance bar.

## Verdict

`LGTM otherwise ✅, 1 point below` — the change is correct and validated on the OSS edition (95 files
/ 1277 tests all pass per `benchmark.md`, ~85s → ~39s). The one point is a cross-edition scope
question that cannot be settled from the OSS tree alone.

## Findings

#### [MEDIUM] `LEAKY_SPECS` is edition-blind — omits the proprietary-only leaky specs the issue named

- [ ] **Category**: Multi-tenancy / edition safety (scope completeness)
- **File**: `apps/frontend/vite.config.ts:25-41` (`LEAKY_SPECS`), applied at `:188` and `:196`
- **What**: The issue enumerates **15** leaky files. The list here carries 11 of them plus 2 newly
  discovered ones (`DeployWithCliModal`, `MembershipChips`) = 13. Four issue-named files are dropped:
  `change-proposals/api/gateways/ChangeProposalsGatewayApi.spec.ts`,
  `change-proposals/api/queries/ChangeProposalsQueries.spec.tsx`,
  `deployments/components/redesign/DeploymentsOverviewRedesign.spec.tsx`,
  `marketplaces/components/MarketplaceDetailLayout.spec.tsx`. I verified none of the four exist in
  this OSS branch — `change-proposals/` and `marketplaces/` are not present as domains at all, so
  omitting them **is correct for OSS**. The concern is that the `test` block is **not edition-gated**
  (only `resolveAliases` branches on `isOssMode`, `vite.config.ts:44-57`), so this same `LEAKY_SPECS`
  governs the proprietary edition — where `change-proposals` and `marketplaces` _do_ exist and were
  the very files the issue profiled as leaky (the issue's 173-file / 2365-test snapshot is a superset
  of OSS's 95 / 1277, i.e. it was measured on proprietary).
- **Why it matters**: Under `PACKMIND_EDITION=proprietary`, those specs are not in `LEAKY_SPECS`, so
  they fall through to the `shared` project (`isolate: false`). If they still leak module/global state
  as the issue reported, they corrupt the shared per-worker registry and produce intermittent
  failures in _unrelated_ neighbouring specs — the exact flake class this split exists to prevent, but
  on the edition that was never validated here.
- **Suggested check/fix**: Run the frontend Vitest suite once under `PACKMIND_EDITION=proprietary` (or
  in the packmind-proprietary repo) and confirm green. If those specs still leak, add them back to
  `LEAKY_SPECS` (harmless on OSS — non-existent entries are simply not collected, which is why the
  existing 13-entry list works). Longer term, a filesystem/marker-driven list (as the technical pass
  suggested) would make the list self-maintaining across editions.
- **Confidence**: needs confirmation (static review — proprietary tree not inspectable from here)

## Open questions

- **Acceptance bar vs. measured result.** The maintainer's instruction was to open a PR only if the
  local benchmark drops the suite to _"less than 35 seconds."_ `benchmark.md` (this 8-core worker)
  reports the patched suite at **~38.5s / 39.6s** — a solid ~2.2x improvement (−46s) but still above
  the absolute 35s line; the issue's own 11-core machine hit ~20s. Is the 2.2x relative win
  acceptable given the 35s absolute is machine-dependent, or should the go/no-go be re-benchmarked on
  a machine closer to CI before opening the PR? (Decision, not a code defect.)
- **Validation path.** The benchmark was produced via a direct `./node_modules/.bin/vitest` run. The
  repo's documented gate is `nx test frontend`; worth a single confirmation that the `test.projects`
  split is honoured through the Nx target (not just bare Vitest) so CI collects both projects.
- The missing existence-guard on `LEAKY_SPECS` (a rename silently re-pollutes the shared registry) was
  already raised by the technical pass — not re-flagged here.

---

_Static review only — no code was executed and no source was modified. The finding marked "needs
confirmation" should be reproduced (here, under the proprietary edition) before acting. Automated
checks (lint, build, e2e) are out of scope here by design._
