# Security Personal Data in Logs

Prevent personal information from leaking through application logs. Logs are often forwarded to external systems (e.g., Datadog), making it critical to ensure no personally identifiable information (PII) appears in clear text.

## Rules

* Always log personal information in asteriks
* dqzdq
* 2
* 1
* a
* Exclude sensitive fields when logging objects* Mask emails using first 6 characters followed by asterisks
* Never include personal data in error messages that are logged
* Obfuscate emails using first 6 characters followed by asterisks
