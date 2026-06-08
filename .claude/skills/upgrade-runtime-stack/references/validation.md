# Validation harness

After the upgrade plan is applied, these steps must all succeed before merging. Copy this section verbatim into `upgrade-plan.md`.

The order matters — fail fast on cheap checks before paying for full builds.

## Local

1. **Node + npm match the pins**
   ```
   node --version           # expect: vNEW_NODE
   npm --version            # expect: NEW_NPM
   ```
   If `nvm` is in use: `nvm use` should read the new `.nvmrc` automatically.

2. **Clean install**
   ```
   rm -rf node_modules package-lock.json   # only on major bumps; skip for patch/minor
   npm install
   ```
   For patch/minor bumps prefer `npm install` against the existing lockfile so the diff stays auditable.

3. **Lint affected**
   ```
   npm run lint:staged
   ```

4. **Test affected**
   ```
   npm run test:staged
   ```

5. **Build the heaviest targets**
   ```
   ./node_modules/.bin/nx build api
   ./node_modules/.bin/nx build frontend
   ./node_modules/.bin/nx build cli
   ./node_modules/.bin/nx build mcp-server
   ```

6. **Docker build smoke test** (only when Node is bumped)
   ```
   docker build -f dockerfile/Dockerfile.api -t packmind-api:upgrade-check .
   docker build -f dockerfile/Dockerfile.mcp -t packmind-mcp:upgrade-check .
   docker compose -f docker-compose.yml up -d api frontend
   docker compose -f docker-compose.yml ps
   docker compose -f docker-compose.yml down
   ```

## CI

The GitHub Actions workflows already test against the `node-version` matrix entries. After the plan is applied, the **Main CI/CD Pipeline** must be green on the branch before merging:

- `.github/workflows/build.yml`
- `.github/workflows/main.yml`
- `.github/workflows/docker.yml`

If any workflow runs `nx affected`, it picks up the changed files automatically and runs the relevant projects.

## Manual smoke (post-merge)

- Spin up the local stack: `docker compose up -d`.
- Open the frontend on its dev URL and confirm the app loads.
- Hit the API health endpoint.
- Run one MCP server interaction end-to-end.

## Failure handling

If any harness step fails:

1. Capture the exact error in the upgrade PR description.
2. Revert with `git revert <upgrade-commit>` rather than amending — keeps history auditable.
3. Re-run the skill on the reverted branch to regenerate a fresh plan once the upstream fix lands.
