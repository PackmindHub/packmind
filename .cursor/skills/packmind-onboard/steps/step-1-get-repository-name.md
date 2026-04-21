## Step 1 — Get Repository Name

Get the repository name for package naming:

```bash
basename "$(git rev-parse --show-toplevel)"
```

Remember this as the repository name for package creation in Step 2.

Also run `packmind-cli whoami` and extract the `Host:` value from the output. Remember this URL for the completion summary.
