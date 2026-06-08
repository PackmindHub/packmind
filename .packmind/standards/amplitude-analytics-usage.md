# Amplitude analytics usage

* We use Amplitude to get insights about users' behavior when using our product with the different UI (CLI / MCP / web app).
* Only in "cloud" environment (no tracking in open-source deployments)
* Data hosted in EU
* No user related data tracked

## Rules

* Tracked event name should be snake cased
* Event name ends with the verb (e.g 'standard_created', 'user_signed_up')
* Property name should be in lower camel case
