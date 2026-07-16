import { AutoUpdateProvider } from './constants';

const CRON_PLACEHOLDER = '{{CRON}}';

const GITHUB_TEMPLATE = `name: Nightly Packmind update

on:
  schedule:
    - cron: "{{CRON}}"
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: packmind/update-packmind-artifacts@v1
        with:
          api-key: \${{ secrets.PACKMIND_API_KEY }}
`;

const GITLAB_TEMPLATE = `stages:
  - update

nightly-packmind-update:
  stage: update
  image: node:22.17.0
  timeout: 15 minutes
  variables:
    GIT_DEPTH: 0
  rules:
    - if: $CI_PIPELINE_SOURCE == "web"
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - git config user.name "packmind-bot"
    - git config user.email "packmind-bot@users.noreply.gitlab.com"
    - git remote set-url origin "https://oauth2:\${PACKMIND_BOT_TOKEN}@\${CI_SERVER_HOST}/\${CI_PROJECT_PATH}.git"
    - |
      if git ls-remote --exit-code --heads origin packmind-cli-update; then
        git fetch origin packmind-cli-update
        git checkout packmind-cli-update
        git merge --no-edit origin/main || true
      else
        git checkout -b packmind-cli-update
      fi
    - npm install -g @packmind/cli
    - packmind-cli install
    - |
      if [ -z "$(git status --porcelain)" ]; then
        echo "No artifact changes — skipping commit/push."
        exit 0
      fi
    - git add -A
    - 'git commit -m "chore(packmind): nightly artifacts update"'
    - |
      git push origin packmind-cli-update \\
        -o merge_request.create \\
        -o merge_request.target=\${CI_DEFAULT_BRANCH} \\
        -o merge_request.title="chore(packmind): nightly artifacts update" \\
        -o merge_request.description="Automated nightly update of Packmind artifacts via \`packmind-cli install\`. Review the diff under \`.packmind/\` and \`packmind-lock.json\`."
`;

export const buildWorkflowYaml = (
  provider: AutoUpdateProvider,
  cron: string,
): string => {
  switch (provider) {
    case 'github':
      return GITHUB_TEMPLATE.replace(CRON_PLACEHOLDER, cron);
    case 'gitlab':
      return GITLAB_TEMPLATE;
  }
};
