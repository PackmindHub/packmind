## Edge Cases

### Package creation fails

If `packmind-cli packages create` fails:

```
❌ Failed to create package: [error message]

Please check:
  - You are logged in: `packmind-cli login`
  - Your network connection is working
  - The package name is valid

Cannot proceed with onboarding until package is created.
```

Exit the skill. Do not proceed to analysis.

### Not logged in

If CLI commands fail with authentication errors:

```
❌ Not logged in to Packmind

Please run:
  packmind-cli login

Then re-run this skill.
```

### No packages available

If the package listing command returns no packages:

Auto-create a package using the repository name.
