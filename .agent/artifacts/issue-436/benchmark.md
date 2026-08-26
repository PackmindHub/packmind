# Frontend Vitest benchmark — issue #436

Worker: 8 cores, Node v24.18.0, Vitest 4.1.10 / Vite 8.1.5. Nx cache bypassed (direct ./node_modules/.bin/vitest run from apps/frontend), back-to-back.

## Baseline (isolate: true, single project)

```
 Test Files  95 passed (95)
      Tests  1277 passed (1277)
   Duration  81.87s (transform 14.53s, setup 28.17s, import 219.77s, tests 190.68s, environment 92.75s)
---
 Test Files  95 passed (95)
      Tests  1277 passed (1277)
   Duration  88.98s (transform 26.58s, setup 28.25s, import 240.12s, tests 214.33s, environment 90.61s)
```

## Patched (shared isolate:false + isolated isolate:true projects)

```
 Test Files  95 passed (95)
      Tests  1277 passed (1277)
   Duration  38.52s (transform 23.41s, setup 5.97s, import 83.74s, tests 148.99s, environment 84.67s)
---
 Test Files  95 passed (95)
      Tests  1277 passed (1277)
   Duration  39.61s (transform 24.38s, setup 6.03s, import 85.95s, tests 154.45s, environment 85.60s)
```

Per-project split (patched): shared = 82 files (isolate:false), isolated = 13 files (isolate:true). All 95 files / 1277 tests pass.

Result: ~85s -> ~39s wall clock (~2.2x, -46s).
