---
applyTo: '**'
---
# Standard: [E2E] Page object

Write proper PageObjects for our E2E tests :
* Always add this.pageFactory() after navigating to ensure proper typing
* Each route in the frontend should correspond to a Page object
* Use regExp for `expectedUrl` to ensure safer matching (better than the simili-glob of Playwright)

Full standard is available here for further request: [[E2E] Page object](../../.packmind/standards/e2e-page-object.md)