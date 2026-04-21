## Step 4 — Detect Existing Packmind and Agent Configuration

Before analyzing, detect and preserve any existing Packmind/agent configuration.

### Glob (broad, future-proof)
Glob for markdown in these roots (recursive):
- `.packmind/**/*.md`
- `.claude/**/*.md`
- `.agents/**/*.md`
- `**/skills/**/*.md`
- `**/rules/**/*.md`

### Classify
Classify found files into counts:
- **standards**: `.packmind/standards/**/*.md`
- **commands**: `.packmind/commands/**/*.md`
- **other_docs**: any markdown under `.claude/`, `.agents/`, or any `skills/` or `rules/` directory outside `.packmind`

If any exist, print exactly:

```
Existing Packmind/agent docs detected:

    Standards: [N]

    Commands: [M]

    Other docs: [P]
```

No overwrites. New files (if you Export) will be added next to the existing ones.
