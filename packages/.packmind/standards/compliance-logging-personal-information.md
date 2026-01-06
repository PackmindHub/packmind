# Compliance - Logging Personal Information

This standard ensures personal information is not exposed in application logs across all environments (development, staging, and production). Logs are often forwarded to external processors such as Datadog, making it critical to prevent leaking sensitive user data. By masking personal information in logs, we maintain user privacy, comply with data protection regulations, and reduce security risks. This standard applies when logging user-related information, debugging authentication flows, tracking user actions, or handling error scenarios involving personal data.

## Rules

* Never log personal information in clear text across all log levels. Always mask sensitive data such as emails, phone numbers, IP addresses, and other personally identifiable information before logging.
* Use the standard masking format of first 6 characters followed by "*" for logging user emails. This ensures consistency across the codebase and makes it easier to audit logs for compliance.
