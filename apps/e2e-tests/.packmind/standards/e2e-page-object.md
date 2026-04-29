# [E2E] Page object

Write proper PageObjects for our E2E tests

## Rules

* Use regExp for `expectedUrl` to ensure safer matching (better than the simili-glob of Playwright)
* Each route in the frontend should correspond to a Page object
* Always add this.pageFactory() after navigating to ensure proper typing
