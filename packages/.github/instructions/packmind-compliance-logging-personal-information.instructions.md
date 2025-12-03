---
applyTo: '**/*.ts'
---
## Standard: Compliance - Logging Personal Information

Ensure personal information is masked in logs using a standard format in TypeScript projects to maintain user privacy and comply with data protection regulations when logging user-related information or debugging authentication flows. :
* Never log personal information in clear text across all log levels. Always mask sensitive data such as emails, phone numbers, IP addresses, and other personally identifiable information before logging.
* Use the standard masking format of first 6 characters followed by "*" for logging user emails. This ensures consistency across the codebase and makes it easier to audit logs for compliance.

Full standard is available here for further request: [Compliance - Logging Personal Information](../../.packmind/standards/compliance-logging-personal-information.md)