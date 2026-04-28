export const STEP_5_DETECT_PROJECT_STACK = `## Step 5 — Detect Project Stack

Run a single Glob for language markers:
\`{package.json,pnpm-lock.yaml,yarn.lock,tsconfig.json,pyproject.toml,requirements.txt,setup.py,go.mod,Cargo.toml,Gemfile,pom.xml,build.gradle,build.gradle.kts,*.csproj,*.sln,composer.json}\`

Run a second Glob for architecture markers:
\`{src/application,src/domain,src/infra,src/controllers,src/services,packages,apps}\`

Map matches → languages (JS/TS, Python, Go, Rust, Ruby, JVM, .NET, PHP), repo shape (\`monorepo\` if \`packages/\` or \`apps/\`, else \`single\`), and architecture markers (Hexagonal/DDD, Layered/MVC, Monorepo).

Print exactly:

\`\`\`
Stack detected (heuristic):

    Languages: [..]

    Repo shape: [monorepo|single]

    Architecture markers: [..|none]
\`\`\`
`;
