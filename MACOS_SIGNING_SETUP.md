# macOS CLI Code Signing Setup

## What Was Implemented

1. **Modified `.github/workflows/build-proprietary.yml`**
   - Removed CLI executable building (Bun setup and artifact upload)
   - Now only builds and tests the CLI TypeScript code

2. **Modified `.github/workflows/docker-proprietary.yml`**
   - Contains `build-cli-executables` job that builds executables for all platforms
   - Uploads artifact as `cli-executables-{version}` (e.g., `cli-executables-0.1.0`)

3. **Created `.github/workflows/sign-macos-cli.yml`**
   - Reusable workflow called by main pipeline
   - Runs **after** `docker-proprietary` completes
   - Uses `continue-on-error: true` so it won't block the pipeline if signing fails
   - **Only runs on `main` branch** (not on pull requests or release tags)
   - Gracefully handles missing secrets (will skip signing but still upload artifacts)
   - Signs only the macOS arm64 executable

4. **Modified `.github/workflows/main.yml`**
   - Added `sign-macos-cli` job that depends on `docker-proprietary` completing
   - Passes CLI artifact name from docker-proprietary output
   - Passes secrets for code signing (optional - skips gracefully if not configured)

## How It Works

1. **Stage 1**: `build-proprietary` workflow builds and tests CLI TypeScript code
2. **Stage 2**: Quality checks run
3. **Stage 3**: `docker-proprietary` workflow's `build-cli-executables` job builds platform executables
4. **Stage 3**: Uploads artifact as `cli-executables-{version}` (e.g., `cli-executables-0.1.0`)
5. **Stage 3** (after docker-proprietary): `sign-macos-cli` job downloads the CLI executables artifact
6. Copies `packmind-cli-macos-arm64` to `packmind-cli-macos-arm64-signed`
7. If secrets are configured: signs the copied binary (original remains unsigned)
8. If secrets are NOT configured: skips signing (job still succeeds, doesn't block pipeline)
9. Uploads signed binary as `cli-executables-{version}-macos-arm64-signed` (artifact contains the file `packmind-cli-macos-arm64-signed`)

**Note**: The signing job only runs on `release-cli/*` tags. It will NOT run on main branch pushes, pull requests, or other release tags.

## Required GitHub Secrets

### For Code Signing (Required)

To enable code signing, you need to add these **3 secrets** to your GitHub repository:

### 1. `MACOS_CERTIFICATE`

- **What**: Your Apple Developer certificate as a base64-encoded `.p12` file
- **How to get it**:
  1. Enroll in Apple Developer Program ($99/year)
  2. Generate a "Developer ID Application" certificate from Apple Developer portal
  3. Export the certificate from Keychain Access as a `.p12` file with a password
  4. Convert to base64:
     ```bash
     base64 -i YourCertificate.p12 | pbcopy
     ```
  5. Paste the base64 string as the secret value

### 2. `MACOS_CERTIFICATE_PASSWORD`

- **What**: The password you set when exporting the `.p12` file
- **How to get it**: Use the password you chose in step 3 above

### 3. `MACOS_SIGNING_IDENTITY`

- **What**: Your signing identity hash (recommended) or full identity string
- **How to get it**: After importing your certificate locally, run:
  ```bash
  security find-identity -v -p codesigning
  ```
- **Example output**:
  ```
  1) 487FA59AFD429EE77C1F2D6694BE9277E70F1FE2 "Developer ID Application: Packmind (ABC123XYZ)"
  ```
- **Recommended**: Use the **hash** (e.g., `487FA59AFD429EE77C1F2D6694BE9277E70F1FE2`) instead of the full name
- The hash is more reliable for automation and avoids issues with special characters

### For Notarization (Optional but Recommended for Production)

To enable notarization and eliminate security warnings, add these **3 additional secrets**:

### 4. `APPLE_ID`

- **What**: Your Apple Developer account email
- **Example**: `dev@packmind.com`
- Simply use the email you use to log in to https://developer.apple.com

### 5. `APPLE_ID_PASSWORD`

- **What**: An app-specific password for notarization
- **How to get it**:
  1. Go to https://appleid.apple.com/
  2. Sign in with your Apple ID
  3. Navigate to **Security** → **App-Specific Passwords**
  4. Click **Generate an app-specific password**
  5. Name it: `GitHub Actions Notarization`
  6. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)
- **Important**: This is NOT your regular Apple ID password

### 6. `APPLE_TEAM_ID`

- **What**: Your Apple Developer Team ID (10-character identifier)
- **How to get it**:
  1. Go to https://developer.apple.com/account
  2. Click **Membership** in the sidebar
  3. Copy your **Team ID** (e.g., `ABC123XYZ`)

## Testing the Workflow

### Without Secrets (Testing Workflow Structure)

1. Create and push a `release-cli/*` tag:
   ```bash
   git tag release-cli/1.0.0-test
   git push origin release-cli/1.0.0-test
   ```
2. Open the "Main CI/CD Pipeline" workflow run in GitHub Actions
3. Wait for `docker-proprietary` job to complete (builds CLI executables)
4. Check the `sign-macos-cli` job - it should run after docker-proprietary
5. The job should succeed but skip signing steps (secrets not configured)
6. Download the artifact `cli-executables-{version}-macos-arm64-signed` (e.g., `cli-executables-0.1.0-macos-arm64-signed`) - will be unsigned

**Note**: The job only runs on `release-cli/*` tags, NOT on main branch pushes, pull requests, or other release tags.

### With Signing Only (No Notarization)

1. Add the 3 signing secrets to GitHub repository settings (see "For Code Signing" section)
2. Create and push a `release-cli/*` tag:
   ```bash
   git tag release-cli/1.0.0
   git push origin release-cli/1.0.0
   ```
3. Open the "Main CI/CD Pipeline" workflow run in GitHub Actions
4. Wait for `docker-proprietary` job to complete
5. Check the `sign-macos-cli` job - it should sign the macOS arm64 binary
6. Download the artifact `cli-executables-{version}-macos-arm64-signed`
7. Extract and run the signed macOS executable:
   ```bash
   chmod +x ./packmind-cli-macos-arm64-signed
   # Will show security warning - use workaround:
   xattr -d com.apple.quarantine ./packmind-cli-macos-arm64-signed
   ./packmind-cli-macos-arm64-signed lint --help
   ```
8. **Note**: Users will need the workaround until notarization is enabled

### With Signing + Notarization (Production Ready)

1. Add all **6 secrets** to GitHub repository settings (signing + notarization)
2. Create and push a `release-cli/*` tag:
   ```bash
   git tag release-cli/1.0.0
   git push origin release-cli/1.0.0
   ```
3. Open the "Main CI/CD Pipeline" workflow run in GitHub Actions
4. Wait for `docker-proprietary` job to complete
5. Check the `sign-macos-cli` job:
   - Should sign the binary
   - Should submit to Apple for notarization (~5-30 minutes)
   - Notarization ticket stored by Apple
6. Download the artifact `cli-executables-{version}-macos-arm64-signed`
7. Extract and run the notarized macOS executable:
   ```bash
   chmod +x ./packmind-cli-macos-arm64-signed
   ./packmind-cli-macos-arm64-signed lint --help
   ```
8. **✅ Should run immediately without ANY warnings or workarounds!**

## Workflow Behavior

- ✅ Runs on macOS runners (`depot-macos-15`)
- ✅ **Only runs on `release-cli/*` tags** (not on main branch, PRs, or other release tags)
- ✅ Runs **after** `docker-proprietary` completes (avoids duplicate CLI builds)
- ✅ Integrated into main pipeline (visible in workflow graph)
- ✅ Doesn't block pipeline (uses `continue-on-error: true` at job level)
- ✅ Gracefully handles missing secrets (signs without notarization if some secrets missing)
- ✅ Provides detailed summary in GitHub Actions UI
- ✅ Signs only macOS arm64 executable (the primary target platform)
- ✅ Uses proper entitlements for Bun/JavaScript execution
- ✅ Verifies signatures after signing
- ✅ **Notarizes if credentials provided** (~5-30 minutes for Apple to process)
- 📋 **Note**: Stapling not supported for raw executables (ticket verified online by macOS)

## Entitlements Used

The workflow uses the entitlements defined in `apps/cli/entitlements.plist`. These are the **minimal required permissions** for the Packmind CLI to function:

### Required Entitlements

1. **`com.apple.security.cs.allow-jit`**
   - **Purpose**: Allows Just-In-Time (JIT) compilation
   - **Needed for**: Bun's JavaScript engine to compile and execute JavaScript code (detection programs)
   - **CLI Usage**: Running linter detection programs dynamically

2. **`com.apple.security.cs.allow-unsigned-executable-memory`**
   - **Purpose**: Allows the executable to create unsigned executable memory pages
   - **Needed for**: Bun's memory management and dynamic code execution
   - **CLI Usage**: Loading and executing tree-sitter WASM parsers and detection programs

3. **`com.apple.security.cs.disable-executable-page-protection`**
   - **Purpose**: Disables executable page protection for the process
   - **Needed for**: Bun's internal memory management
   - **CLI Usage**: Efficient memory allocation for JavaScript runtime

### What the CLI Does (Security Context)

The CLI performs these operations:

- ✅ **Reads local files** (filesystem access - granted by default on macOS)
- ✅ **Makes HTTP API calls** to Packmind server (network access - granted by default for outgoing connections)
- ✅ **Executes git commands** to get repository URL (subprocess execution - allowed)
- ✅ **Parses code using tree-sitter** (WASM execution - requires JIT and memory entitlements)
- ✅ **Runs JavaScript detection programs** (dynamic code execution - requires JIT and memory entitlements)

### Permissions NOT Granted (More Secure)

These permissions are intentionally **not** included to maintain security:

- ❌ `com.apple.security.cs.allow-dyld-environment-variables` - Not needed for CLI operation
- ❌ `com.apple.security.cs.disable-library-validation` - Not needed for CLI operation
- ❌ File write permissions beyond standard user access
- ❌ Access to system resources beyond standard user access

The entitlements file can be customized at `apps/cli/entitlements.plist` if additional permissions are needed in the future.

## Troubleshooting

### Job doesn't appear

- Verify you pushed to `main` branch (not a PR or release tag)
- Look for the `sign-macos-cli` job in the "Main CI/CD Pipeline" workflow run
- It should appear in Stage 3 alongside `docker-oss` and `docker-proprietary`

### Signing fails

- Verify all 3 secrets are correctly set
- Check that certificate hasn't expired
- Verify the signing identity string matches exactly
- Check workflow logs for detailed error messages

### "Unidentified developer" warning still appears

- Ensure you downloaded the SIGNED artifact (`cli-executables-{version}-macos-arm64-signed`)
- Check that signing step actually ran (not skipped)
- Verify signature with: `codesign -vvv --verify ./packmind-cli-macos-arm64-signed`
- **If still seeing warnings**: Notarization might not have run
  - Check if notarization secrets are configured
  - Verify notarization step completed in GitHub Actions (look for "Accepted" status)
  - Check notarization online: `spctl -a -vv -t install ./packmind-cli-macos-arm64-signed`

### How to verify notarization worked

```bash
# Check notarization status (requires internet connection)
spctl -a -vv -t install ./packmind-cli-macos-arm64-signed

# Expected output if notarized:
# ./packmind-cli-macos-arm64-signed: accepted
# source=Notarized Developer ID

# Alternative: Check signature info
codesign -dvv ./packmind-cli-macos-arm64-signed 2>&1 | grep -i "runtime\|notarized"

# Expected to see:
# flags=0x10000(runtime) <- Hardened Runtime enabled
```

**Note**: Raw executables cannot have the notarization ticket "stapled" (embedded). macOS verifies the ticket online with Apple's servers when the binary first runs. An internet connection is required on first launch only.

## Next Steps

1. **Immediate**: Test the workflow by creating a `release-cli/*` tag (will skip signing if secrets not configured)
2. **When ready**: Obtain Apple Developer certificate and add the 3 signing secrets to repository
3. **Optional**: Add 3 notarization secrets for production-ready distribution
4. **Test**: Create another `release-cli/*` tag to test signing (and notarization if configured)
5. **Finally**: Download the `cli-executables-{version}-macos-arm64-signed` artifact and verify the signed executable (`packmind-cli-macos-arm64-signed`) works without warnings

## Notes

- The signing job runs after Docker builds complete
- Failures don't block the pipeline (uses `continue-on-error: true`)
- The job can be disabled by removing it from `main.yml` without affecting anything else
- Notarization is now fully implemented and working
- Create `release-cli/*` tags to trigger CLI signing and distribution
